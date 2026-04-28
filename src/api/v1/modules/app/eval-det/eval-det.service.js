const AppError = require('@utils/AppError');

class EvalDetService {
	constructor(repository) {
		this.repository = repository;
	}

	// Basic heuristics to detect gibberish or low-quality content
	static looksGibberish(str) {
		const s = (str || '').trim();
		if (!s) return true;
		// Repeated single char 5+ times
		if (/(.)\1{4,}/.test(s)) return true;
		// Very long consonant cluster (unlikely in Spanish)
		if (/[bcdfghjklmnpqrstvwxyz]{6,}/i.test(s)) return true;
		// Extremely low vowel ratio for longer strings
		const letters = (s.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) || []).length;
		const vowels = (s.match(/[aeiouáéíóúü]/ig) || []).length;
		if (letters >= 8 && vowels / Math.max(letters, 1) < 0.25) return true;
		return false;
	}

	static isAllowedChars(str) {
		// Allow Spanish letters, numbers, spaces and common punctuation
		return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s.,;:!¡?¿"'()\-/%]+$/.test(str);
	}

	static validateCommentContent(str, type, existingComments = []) {
		const s = (str || '').trim();
		if (!s) return false;
		if (!EvalDetService.isAllowedChars(s)) return false;
		if (EvalDetService.looksGibberish(s)) return false;
		if (EvalDetService.isDuplicate(s, existingComments)) return false;

		const vowels = (s.match(/[aeiouáéíóúü]/ig) || []).length;
		const words = s.split(/\s+/).filter(w => /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(w));

		if (type === 'item') {
			if (s.length < 5 || s.length > 500) return false;
			if (vowels < 1) return false;
			return true;
		}

		if (type === 'general') {
			if (s.length < 15 || s.length > 2000) return false;
			if (words.length < 2) return false;
			if (vowels < 3) return false;
			return true;
		}

		return false;
	}

	static getValidationErrors(str, type, existingComments = []) {
		const s = (str || '').trim();
		const errors = [];

		if (!s) {
			errors.push('El campo no puede estar vacío');
			return errors;
		}

		const vowels = (s.match(/[aeiouáéíóúü]/ig) || []).length;
		const words = s.split(/\s+/).filter(w => /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(w));

		if (!EvalDetService.isAllowedChars(s)) {
			errors.push('Contiene caracteres no permitidos. Solo se permiten: letras (incluyendo acentos), números, espacios y puntuación básica (. , ; : ! ¡ ? ¿ " \' ( ) - / %)');
		}

		if (EvalDetService.looksGibberish(s)) {
			errors.push('El contenido parece gibberish: tiene caracteres repetidos excesivamente, muchas consonantes seguidas, o muy pocas vocales');
		}

		if (EvalDetService.isDuplicate(s, existingComments)) {
			errors.push('Este comentario ya fue utilizado anteriormente. Por favor, escribe un comentario diferente');
		}

		if (type === 'item') {
			if (s.length < 5 || s.length > 500) {
				errors.push(`Largo inválido: debe tener entre 5 y 500 caracteres (actualmente tiene ${s.length})`);
			}
			if (vowels < 1) {
				errors.push('Debe contener al menos 1 vocal');
			}
		}

		if (type === 'general') {
			if (s.length < 15 || s.length > 2000) {
				errors.push(`Largo inválido: debe tener entre 15 y 2000 caracteres (actualmente tiene ${s.length})`);
			}
			if (words.length < 2) {
				errors.push(`Debe contener al menos 2 palabras (actualmente tiene ${words.length})`);
			}
			if (vowels < 3) {
				errors.push(`Debe contener al menos 3 vocales (actualmente tiene ${vowels})`);
			}
		}

		return errors;
	}

	static getFieldRules(type) {
		if (type === 'item') {
			return {
				minLength: 5,
				maxLength: 500,
				minVowels: 1,
				noDuplicates: true,
				allowedChars: 'Letras españolas, números, espacios y puntuación: . , ; : ! ¡ ? ¿ " \' ( ) - / %',
				noGibberish: true
			};
		}
		if (type === 'general') {
			return {
				minLength: 15,
				maxLength: 2000,
				minWords: 2,
				minVowels: 3,
				noDuplicates: true,
				allowedChars: 'Letras españolas, números, espacios y puntuación: . , ; : ! ¡ ? ¿ " \' ( ) - / %',
				noGibberish: true
			};
		}
		return {};
	}

	static normalizeText(str) {
		return (str || '')
			.trim()
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '') // Remove accents
			.replace(/\s+/g, ' '); // Normalize spaces
	}

	static isDuplicate(currentText, existingComments) {
		const normalized = EvalDetService.normalizeText(currentText);
		return existingComments.some(comment => {
			const normalizedExisting = EvalDetService.normalizeText(comment);
			return normalized === normalizedExisting;
		});
	}

	async saveBulk({ eval_id, items, cmt_gen }) {
		if (!eval_id || !Array.isArray(items)) {
			throw new AppError('Datos inválidos: eval_id e items son requeridos', 400);
		}
		if (!items.length) return { count: 0 };

		// Verificar si ya existen respuestas guardadas
		const hasDetails = await this.repository.hasExistingDetails(Number(eval_id));
		if (hasDetails) {
			throw new AppError('Las respuestas de esta evaluación ya fueron guardadas', 409);
		}

		const aeIds = items.map(i => Number(i.a_e_id)).filter(Boolean);
		if (!aeIds.length) throw new AppError('Items sin a_e_id', 400);

		const flags = await this.repository.getAEFlagsByIds(aeIds);
		const flagById = new Map(flags.map(f => [f.id, f]));

		const validationIssues = [];

		// Obtener comentarios existentes para validar duplicados
		const existingItemComments = await this.repository.getExistingItemComments(aeIds);
		const commentsByAeId = new Map();
		existingItemComments.forEach(item => {
			if (!commentsByAeId.has(item.a_e_id)) {
				commentsByAeId.set(item.a_e_id, []);
			}
			commentsByAeId.get(item.a_e_id).push(item.cmt);
		});

		// Detectar duplicados dentro del mismo request
		const requestCommentMap = new Map(); // Normalizado -> [a_e_ids]
		for (const it of items) {
			const comment = (it.cmt ?? '').trim();
			if (!comment) continue;

			const normalized = EvalDetService.normalizeText(comment);
			if (!requestCommentMap.has(normalized)) {
				requestCommentMap.set(normalized, []);
			}
			requestCommentMap.get(normalized).push(Number(it.a_e_id));
		}

		// Validar comentarios dentro del request
		for (const [normalized, aeIdsList] of requestCommentMap.entries()) {
			if (aeIdsList.length > 1) {
				// Hay duplicados dentro del request
				aeIdsList.forEach(aeId => {
					validationIssues.push({
						field: `cmt_${aeId}`,
						message: 'Comentario duplicado dentro de esta solicitud',
						note: `Este comentario ya aparece en otras respuestas`,
						rules: EvalDetService.getFieldRules('item')
					});
				});
			}
		}

		// Validate comment requirements per a_e
		for (const it of items) {
			const meta = flagById.get(Number(it.a_e_id));
			if (!meta) throw new AppError(`a_e_id ${it.a_e_id} no encontrado`, 400);
			let comment = (it.cmt ?? '').trim();
			const existingComments = commentsByAeId.get(Number(it.a_e_id)) || [];

			if (meta.es_cmt_oblig && !comment) {
				validationIssues.push({ 
					field: `cmt_${it.a_e_id}`, 
					message: 'Comentario obligatorio',
					rules: EvalDetService.getFieldRules('item')
				});
			}
			// If comments disabled at this aspecto, nullify any provided comment
			if (!meta.es_cmt) {
				it.cmt = null;
				continue;
			}

			// If comment provided and enabled, validate content quality
			if (meta.es_cmt && comment) {
				if (!EvalDetService.validateCommentContent(comment, 'item', existingComments)) {
					const errors = EvalDetService.getValidationErrors(comment, 'item', existingComments);
					validationIssues.push({ 
						field: `cmt_${it.a_e_id}`, 
						message: 'Comentario inválido',
						errors,
						rules: EvalDetService.getFieldRules('item')
					});
				}
				// Normalize stored value
				it.cmt = comment;
			}
		}

		// Validate general comment according to cfg_t flags
		const genFlags = await this.repository.getGeneralCommentFlags(Number(eval_id));
		const existingGeneralComments = await this.repository.getExistingGeneralComments(Number(eval_id));
		const generalCommentTexts = existingGeneralComments.map(e => e.cmt_gen).filter(Boolean);

		if (genFlags.es_cmt_gen_oblig) {
			const gc = (cmt_gen ?? '').trim();
			if (!gc) validationIssues.push({ 
				field: 'cmt_gen', 
				message: 'Comentario general obligatorio',
				rules: EvalDetService.getFieldRules('general')
			});
		}
		// If general comments disabled, ignore any provided
		if (!genFlags.es_cmt_gen) {
			cmt_gen = null;
		}

		// If general comment provided and enabled, validate content quality
		if (genFlags.es_cmt_gen) {
			const gc = (cmt_gen ?? '').trim();
			if (gc) {
				if (!EvalDetService.validateCommentContent(gc, 'general', generalCommentTexts)) {
					const errors = EvalDetService.getValidationErrors(gc, 'general', generalCommentTexts);
					validationIssues.push({ 
						field: 'cmt_gen', 
						message: 'Comentario general inválido',
						errors,
						rules: EvalDetService.getFieldRules('general')
					});
				}
				cmt_gen = gc;
			}
		}

		if (validationIssues.length) {
			throw new AppError('Comentarios inválidos', 400, validationIssues);
		}

		return this.repository.createMany(Number(eval_id), items, cmt_gen);
	}
}

module.exports = EvalDetService;
