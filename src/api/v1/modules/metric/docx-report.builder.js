'use strict';

/**
 * Injects generated content into the institutional DOCX template.
 * Preserves the university header (letterhead image), styles, and page numbering.
 * Content XML is generated to match the template's visual language:
 *   navy 1F3864, blue 2E75B6, light-blue EBF3FB, Arial font.
 */

const PizZip = require('pizzip');
const fs     = require('fs');
const path   = require('path');

const TEMPLATE_PATH = path.resolve(__dirname, '../../templates/Carta_UniPutumayo.docx');

// ─── Color palette (matches template) ────────────────────────────────────────
const C = {
    navy:   '1F3864',
    blue:   '2E75B6',
    lblue:  'EBF3FB',
    bblue:  'C5D9F1',
    dblue:  'D6E4F7',
    white:  'FFFFFF',
    gray:   '666666',
    dark:   '111111',
    green:  '1F7842',
    amber:  'B8860B',
    orange: 'C0622B',
    red:    'B22222',
    lgray:  'F5F5F5',
    mgray:  'E0E0E0',
};

// ─── EMU (English Metric Units) constants ────────────────────────────────────
const EMU_PER_CM = 360000;
const CHART_W    = Math.round(16.5 * EMU_PER_CM);
const CHART_H    = Math.round( 9.5 * EMU_PER_CM);

// ─── XML namespaces for document.xml root ─────────────────────────────────────
const NS = `xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" `
    + `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" `
    + `xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" `
    + `xmlns:v="urn:schemas-microsoft-com:vml" `
    + `xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" `
    + `xmlns:w10="urn:schemas-microsoft-com:office:word" `
    + `xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" `
    + `xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" `
    + `xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" `
    + `mc:Ignorable="w14 w15" `
    + `xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"`;

// ─── Low-level XML helpers ────────────────────────────────────────────────────

function esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function rPr({ bold = false, italic = false, color = C.dark, size = 20, font = 'Arial' } = {}) {
    return `<w:rPr>`
        + `<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>`
        + (bold   ? `<w:b/><w:bCs/>` : '')
        + (italic ? `<w:i/><w:iCs/>` : '')
        + `<w:color w:val="${color}"/>`
        + `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`
        + `</w:rPr>`;
}

function run(text, style = {}) {
    return `<w:r>${rPr(style)}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}

function pPr({ align = '', spaceBefore = 0, spaceAfter = 80, fill = '', borderBottom = '', indLeft = 0 } = {}) {
    let xml = `<w:pPr>`;
    if (spaceBefore || spaceAfter) xml += `<w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}"/>`;
    if (align) xml += `<w:jc w:val="${align}"/>`;
    if (fill)  xml += `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>`;
    if (indLeft) xml += `<w:ind w:left="${indLeft}"/>`;
    if (borderBottom) xml += `<w:pBdr><w:bottom w:val="single" w:sz="8" w:space="1" w:color="${borderBottom}"/></w:pBdr>`;
    xml += `</w:pPr>`;
    return xml;
}

function p(children, pprOpts = {}) {
    return `<w:p>${pPr(pprOpts)}${children}</w:p>`;
}

function spacer(count = 1) {
    return Array.from({ length: count }, () =>
        `<w:p><w:pPr><w:spacing w:before="0" w:after="80"/></w:pPr></w:p>`
    ).join('');
}

function pageBreak() {
    return `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>`
        + `<w:r><w:br w:type="page"/></w:r></w:p>`;
}

// ─── Table helpers ────────────────────────────────────────────────────────────

function tcPr({ width = 0, fill = C.white, borders = true, vAlign = 'center', pad = '80:140:80:140' } = {}) {
    const [t, l, b, r] = pad.split(':').map(Number);
    const bval = borders
        ? `<w:top w:val="single" w:sz="2" w:space="0" w:color="${C.bblue}"/>`
          + `<w:left w:val="single" w:sz="2" w:space="0" w:color="${C.bblue}"/>`
          + `<w:bottom w:val="single" w:sz="2" w:space="0" w:color="${C.bblue}"/>`
          + `<w:right w:val="single" w:sz="2" w:space="0" w:color="${C.bblue}"/>`
        : `<w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>`
          + `<w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>`
          + `<w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>`
          + `<w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>`;
    return `<w:tcPr>`
        + (width ? `<w:tcW w:w="${width}" w:type="dxa"/>` : '')
        + `<w:tcBorders>${bval}</w:tcBorders>`
        + `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>`
        + `<w:tcMar><w:top w:w="${t}" w:type="dxa"/><w:left w:w="${l}" w:type="dxa"/><w:bottom w:w="${b}" w:type="dxa"/><w:right w:w="${r}" w:type="dxa"/></w:tcMar>`
        + `<w:vAlign w:val="${vAlign}"/>`
        + `</w:tcPr>`;
}

function tc(children, tcOpts = {}) {
    return `<w:tc>${tcPr(tcOpts)}${children}</w:tc>`;
}

function tr(cells) {
    return `<w:tr><w:trPr><w:trHeight w:val="400" w:hRule="atLeast"/></w:trPr>${cells}</w:tr>`;
}

function tbl(rows, cols) {
    const gridCols = cols.map(w => `<w:gridCol w:w="${w}"/>`).join('');
    return `<w:tbl>`
        + `<w:tblPr>`
        + `<w:tblW w:w="9360" w:type="dxa"/>`
        + `<w:tblBorders>`
        + `<w:top w:val="single" w:sz="4" w:space="0" w:color="${C.bblue}"/>`
        + `<w:left w:val="single" w:sz="4" w:space="0" w:color="${C.bblue}"/>`
        + `<w:bottom w:val="single" w:sz="4" w:space="0" w:color="${C.bblue}"/>`
        + `<w:right w:val="single" w:sz="4" w:space="0" w:color="${C.bblue}"/>`
        + `<w:insideH w:val="single" w:sz="2" w:space="0" w:color="${C.bblue}"/>`
        + `<w:insideV w:val="single" w:sz="2" w:space="0" w:color="${C.bblue}"/>`
        + `</w:tblBorders>`
        + `<w:tblCellMar><w:left w:w="10" w:type="dxa"/><w:right w:w="10" w:type="dxa"/></w:tblCellMar>`
        + `</w:tblPr>`
        + `<w:tblGrid>${gridCols}</w:tblGrid>`
        + rows
        + `</w:tbl>`;
}

// ─── Image drawing XML (inline) ───────────────────────────────────────────────

function drawingInline(rId, imgId, w = CHART_W, h = CHART_H) {
    const NS_A   = 'http://schemas.openxmlformats.org/drawingml/2006/main';
    const NS_PIC = 'http://schemas.openxmlformats.org/drawingml/2006/picture';
    const NS_R   = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    return `<w:drawing>`
        + `<wp:inline distT="0" distB="114300" distL="0" distR="0">`
        + `<wp:extent cx="${w}" cy="${h}"/>`
        + `<wp:effectExtent l="0" t="0" r="0" b="0"/>`
        + `<wp:docPr id="${imgId}" name="Chart${imgId}"/>`
        + `<wp:cNvGraphicFramePr>`
        + `<a:graphicFrameLocks xmlns:a="${NS_A}" noChangeAspect="1"/>`
        + `</wp:cNvGraphicFramePr>`
        + `<a:graphic xmlns:a="${NS_A}">`
        + `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">`
        + `<pic:pic xmlns:pic="${NS_PIC}">`
        + `<pic:nvPicPr>`
        + `<pic:cNvPr id="${imgId}" name="Chart${imgId}"/>`
        + `<pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr>`
        + `</pic:nvPicPr>`
        + `<pic:blipFill>`
        + `<a:blip xmlns:r="${NS_R}" r:embed="${rId}"/>`
        + `<a:stretch><a:fillRect/></a:stretch>`
        + `</pic:blipFill>`
        + `<pic:spPr bwMode="auto">`
        + `<a:xfrm><a:off x="0" y="0"/><a:ext cx="${w}" cy="${h}"/></a:xfrm>`
        + `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>`
        + `<a:noFill/>`
        + `</pic:spPr>`
        + `</pic:pic>`
        + `</a:graphicData>`
        + `</a:graphic>`
        + `</wp:inline>`
        + `</w:drawing>`;
}

// ─── Section-level XML builders ───────────────────────────────────────────────

function titleTable(subtitle) {
    return tbl(
        tr(
            tc(
                p(run('Universidad del Putumayo', { bold: true, size: 32, color: C.white }), { align: 'center', spaceAfter: 60 })
                + p(run(subtitle, { size: 22, color: C.dblue }), { align: 'center', spaceAfter: 0 }),
                { fill: C.navy, borders: false, pad: '240:300:240:300' }
            )
        ),
        [9360]
    );
}

function infoRow(label, value) {
    return tr(
        tc(p(run(label, { bold: true, size: 18, color: C.gray }), { spaceAfter: 60 }),
            { width: 2600, fill: C.lblue, pad: '80:140:80:140' })
        + tc(p(run(value, { size: 18, color: C.dark }), { spaceAfter: 60 }),
            { width: 6760, fill: C.white, pad: '80:140:80:140' })
    );
}

function infoTable(rows) {
    return tbl(rows.map(([l, v]) => infoRow(l, v)).join(''), [2600, 6760]);
}

function sectionHeading(text) {
    return p(run(text.toUpperCase(), { bold: true, size: 22, color: C.blue }), {
        spaceBefore: 320, spaceAfter: 120, borderBottom: C.blue,
    });
}

function labelValueP(label, value, noteColor = null) {
    const valColor = noteColor ?? C.dark;
    return p(
        run(label + ': ', { bold: true, size: 19, color: C.gray })
        + run(value, { bold: Boolean(noteColor), size: 19, color: valColor }),
        { spaceAfter: 60 }
    );
}

function bulletP(text) {
    return `<w:p>`
        + `<w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>`
        + `<w:spacing w:before="40" w:after="40"/></w:pPr>`
        + run(text, { size: 19, color: C.dark })
        + `</w:p>`;
}

function noteColor(val) {
    const n = Number(val);
    if (!Number.isFinite(n)) return null;
    if (n >= 4.0) return C.green;
    if (n >= 3.0) return C.amber;
    if (n >= 2.0) return C.orange;
    return C.red;
}

function fmtNota(val) {
    const n = Number(val);
    return Number.isFinite(n) ? n.toFixed(2) : '—';
}

// ─── Aspectos table ───────────────────────────────────────────────────────────

function aspectosTableXml(aspectos = []) {
    if (!aspectos.length) return '';

    const headerRow = tr(
        tc(p(run('Aspecto evaluado', { bold: true, size: 19, color: C.white }), { spaceAfter: 60 }), { fill: C.navy, width: 5616, borders: false, pad: '80:140:80:140' })
        + tc(p(run('Promedio', { bold: true, size: 19, color: C.white }), { align: 'center', spaceAfter: 60 }), { fill: C.navy, width: 1872, borders: false, pad: '80:140:80:140' })
        + tc(p(run('Respuestas', { bold: true, size: 19, color: C.white }), { align: 'center', spaceAfter: 60 }), { fill: C.navy, width: 1872, borders: false, pad: '80:140:80:140' })
    );

    const dataRows = aspectos.map((a, i) => {
        const fill = i % 2 === 0 ? C.white : C.lblue;
        const prom = Number(a.promedio ?? a.promedio_general ?? 0);
        const nc = noteColor(prom);
        return tr(
            tc(p(run(a.nombre ?? a.aspecto_nombre ?? a.label ?? '—', { size: 19, color: C.dark }), { spaceAfter: 60 }), { fill, width: 5616, pad: '80:140:80:140' })
            + tc(p(run(fmtNota(prom), { bold: true, size: 19, color: nc ?? C.dark }), { align: 'center', spaceAfter: 60 }), { fill, width: 1872, pad: '80:140:80:140' })
            + tc(p(run(String(a.total_respuestas ?? a.total ?? '—'), { size: 18, color: C.gray }), { align: 'center', spaceAfter: 60 }), { fill, width: 1872, pad: '80:140:80:140' })
        );
    });

    return tbl([headerRow, ...dataRows].join(''), [5616, 1872, 1872]);
}

// ─── AI analysis block ────────────────────────────────────────────────────────

function aiBlock(cmtAi) {
    if (!cmtAi) return p(run('Sin análisis de IA disponible.', { italic: true, size: 18, color: C.gray }), { spaceBefore: 40, spaceAfter: 40 });

    const { conclusion, fortaleza, debilidad } = cmtAi;
    const forts = Array.isArray(fortaleza) ? fortaleza.filter(Boolean) : [];
    const debs  = Array.isArray(debilidad)  ? debilidad.filter(Boolean)  : [];

    let xml = '';
    if (conclusion) {
        xml += p(
            run('Conclusión: ', { bold: true, size: 19, color: C.blue })
            + run(conclusion, { size: 19, color: C.dark }),
            { spaceBefore: 80, spaceAfter: 80 }
        );
    }
    if (forts.length) {
        xml += p(run('Fortalezas', { bold: true, size: 19, color: C.green }), { spaceBefore: 80, spaceAfter: 40 });
        xml += forts.map(f => bulletP(f)).join('');
    }
    if (debs.length) {
        xml += p(run('Oportunidades de mejora', { bold: true, size: 19, color: C.orange }), { spaceBefore: 80, spaceAfter: 40 });
        xml += debs.map(d => bulletP(d)).join('');
    }
    return xml || p(run('Análisis no disponible.', { italic: true, size: 18, color: C.gray }));
}

// ─── Docente section ──────────────────────────────────────────────────────────

function docenteSection(d, isFirst, chartRid, imgId) {
    let xml = isFirst ? '' : pageBreak();

    // Encabezado del docente (tabla navy)
    xml += tbl(
        tr(
            tc(
                p(run(d.nombre_docente || d.docente || '', { bold: true, size: 28, color: C.white }), { spaceAfter: 60 })
                + p(run(`CC ${d.docente}${d.nombre_docente ? '' : ''}`, { size: 20, color: C.dblue }), { spaceAfter: 0 }),
                { fill: C.navy, borders: false, pad: '200:300:200:300' }
            )
        ),
        [9360]
    );
    xml += spacer(1);

    // Tabla resumen (nota final + total respuestas)
    const notaFinal    = d.nota_final ?? d.aspectos?.resultado_final?.nota_final_ponderada;
    const totalResp    = d.aspectos?.evaluacion_estudiantes?.total_respuestas ?? '—';
    const totalCmt     = d.aspectos?.evaluacion_estudiantes?.total_cmt ?? '—';
    const nc           = noteColor(notaFinal);

    xml += infoTable([
        ['Nota final ponderada:', fmtNota(notaFinal) + (nc ? '' : '')],
        ['Total respuestas:', String(totalResp)],
        ['Total con comentario:', String(totalCmt)],
    ]);
    xml += spacer(1);

    // Resultados por aspecto
    const aspectosArr = d.aspectos?.evaluacion_estudiantes?.aspectos ?? [];
    if (aspectosArr.length) {
        xml += sectionHeading('Resultados por Aspecto');
        if (chartRid) {
            xml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="80" w:after="120"/></w:pPr>`
                + `<w:r>${drawingInline(chartRid, imgId)}</w:r></w:p>`;
        }
        xml += aspectosTableXml(aspectosArr);
        xml += spacer(1);
    }

    // Resultados por materia
    const materias = d.materias ?? [];
    if (materias.length) {
        xml += sectionHeading('Resultados por Materia');

        for (const materia of materias) {
            const notaM = materia.eval?.nota_final_ponderada ?? materia.promedio;
            const ncM   = noteColor(notaM);

            // Nombre de materia (cabecera azul con borde inferior)
            xml += p(
                run(`${materia.nombre_materia || materia.codigo_materia}`, { bold: true, size: 22, color: C.blue })
                + run(`   (${materia.codigo_materia})`, { size: 18, color: C.gray }),
                { spaceBefore: 200, spaceAfter: 80, borderBottom: C.mgray }
            );

            if (Number.isFinite(Number(notaM))) {
                xml += labelValueP('Nota de la materia', fmtNota(notaM), ncM);
            }

            const grupos = materia.grupos ?? [];
            for (const g of grupos) {
                const grupoKey = `${materia.codigo_materia}|${g.grupo}`;
                const cmtAiGrupo = d.cmtAiMap?.get(grupoKey);
                const notaG = g.eval?.nota_final_ponderada ?? g.promedio;
                const ncG   = noteColor(notaG);

                // Cabecera de grupo (celeste)
                xml += tbl(
                    tr(tc(
                        p(run(`Grupo ${g.grupo ?? 'SIN GRUPO'}`, { bold: true, size: 20, color: C.navy }), { spaceAfter: 0 }),
                        { fill: C.lblue, borders: false, pad: '80:200:80:200' }
                    )),
                    [9360]
                );

                if (Number.isFinite(Number(notaG))) {
                    xml += labelValueP('Nota del grupo', fmtNota(notaG), ncG);
                }

                xml += aiBlock(cmtAiGrupo);
                xml += spacer(1);
            }

            // Consolidado (grupo = null)
            const consolidado = d.cmtAiMap?.get(`${materia.codigo_materia}|null`);
            if (consolidado) {
                xml += tbl(
                    tr(tc(
                        p(run('Análisis Consolidado · Todos los grupos', { bold: true, size: 20, color: C.navy }), { spaceAfter: 0 }),
                        { fill: 'FFF0CC', borders: false, pad: '80:200:80:200' }
                    )),
                    [9360]
                );
                xml += aiBlock(consolidado);
                xml += spacer(1);
            }
        }
    }

    return xml;
}

// ─── Context / cover block ────────────────────────────────────────────────────

function coverBlock(ctx) {
    const rows = [
        ['Fecha del informe:', ctx.fecha_hora],
    ];
    if (ctx.periodo)  rows.push(['Período académico:', ctx.periodo]);
    if (ctx.sede)     rows.push(['Sede:', ctx.sede]);
    if (ctx.programa) rows.push(['Programa:', ctx.programa]);
    if (ctx.semestre) rows.push(['Semestre:', ctx.semestre]);
    if (ctx.grupo)    rows.push(['Grupo:', ctx.grupo]);
    const count = ctx.docentes?.length ?? 0;
    if (count > 0)    rows.push(['Docentes incluidos:', String(count)]);

    return titleTable('Reporte de Evaluación Docente')
        + spacer(1)
        + infoTable(rows)
        + spacer(1);
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * @param {object} ctx
 * @param {Array}  ctx.docentes       — enriched docente objects
 * @param {string} ctx.periodo
 * @param {string} ctx.sede
 * @param {string} ctx.programa
 * @param {string} ctx.semestre
 * @param {string} ctx.grupo
 * @param {string} ctx.fecha_hora
 */
async function buildEvaluationReport(ctx) {
    const zip = new PizZip(fs.readFileSync(TEMPLATE_PATH));

    // Parse template rels to find header rId and existing rId numbers
    const relsXml       = zip.file('word/_rels/document.xml.rels')?.asText() ?? '';
    const headerMatch   = relsXml.match(/Id="(rId\d+)"[^>]*[Hh]eader/);
    const headerRid     = headerMatch?.[1] ?? 'rId1';
    const existingNums  = [...relsXml.matchAll(/rId(\d+)/g)].map(m => parseInt(m[1]));
    let   nextRidNum    = Math.max(0, ...existingNums) + 1;

    // Add chart images for each docente; collect rId assignments
    const newRels = [];
    const chartRids = [];

    for (const d of ctx.docentes) {
        if (d.chartImage) {
            const base64 = d.chartImage.replace(/^data:image\/png;base64,/, '');
            const imgBuf = Buffer.from(base64, 'base64');
            const imgName = `image${nextRidNum}.png`;
            zip.file(`word/media/${imgName}`, imgBuf);
            const rid = `rId${nextRidNum}`;
            newRels.push(
                `<Relationship Id="${rid}" `
                + `Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" `
                + `Target="media/${imgName}"/>`
            );
            chartRids.push(rid);
            nextRidNum++;
        } else {
            chartRids.push(null);
        }
    }

    // Patch _rels to add chart image relationships
    if (newRels.length) {
        const patchedRels = relsXml.replace('</Relationships>', newRels.join('') + '</Relationships>');
        zip.file('word/_rels/document.xml.rels', patchedRels);
    }

    // Build body content XML
    let bodyXml = coverBlock(ctx);

    let imgIdCounter = 100;
    ctx.docentes.forEach((d, i) => {
        bodyXml += docenteSection(d, i === 0, chartRids[i], imgIdCounter++);
    });

    // sectPr: reference the template header and set page margins
    const sectPr = `<w:sectPr>`
        + `<w:headerReference w:type="default" r:id="${headerRid}"/>`
        + `<w:pgMar w:top="1440" w:right="1080" w:bottom="1440" w:left="1080" w:header="709" w:footer="709" w:gutter="0"/>`
        + `</w:sectPr>`;

    // Full document.xml
    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
        + `<w:document ${NS}>`
        + `<w:body>`
        + bodyXml
        + sectPr
        + `</w:body>`
        + `</w:document>`;

    zip.file('word/document.xml', docXml);

    return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

module.exports = { buildEvaluationReport };
