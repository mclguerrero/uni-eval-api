'use strict';

/**
 * Institutional DOCX report builder.
 * Visual language: typographic hierarchy only — no colored fills or banners.
 * Palette: near-black body (#1A1A1A), dark gray labels (#555), light gray borders (#CCCCCC).
 * Accent: single institutional green (#1B4332) used only for section underlines and key values.
 */

const PizZip = require('pizzip');
const fs     = require('fs');
const path   = require('path');

const TEMPLATE_PATH = path.resolve(__dirname, '../../templates/Carta_UniPutumayo.docx');

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
    black:  '1A1A1A',   // body text
    gray:   '555555',   // labels, secondary text
    dgray:  '888888',   // tertiary, captions
    lgray:  'F7F7F7',   // alternating row fill (barely visible)
    border: 'CCCCCC',   // all borders and separators
    accent: '1B4332',   // institutional green — section titles, key values
    white:  'FFFFFF',
};

// ─── EMU constants ────────────────────────────────────────────────────────────
const EMU_PER_CM  = 360000;
const CHART_W_CM  = 12.0;   // matches the 1200 px canvas width (narrower = more square)
const CHART_W     = Math.round(CHART_W_CM * EMU_PER_CM);

// Dynamic height: mirrors the canvas formula in metric.service — 1200×(270 + n*150) px.
// Converts to cm so Word preserves the true aspect ratio.
function chartHeightEmu(barCount) {
    const n      = Math.max(1, barCount || 4);
    const pxH    = 270 + n * 150;          // HEADER_H(180) + n*BAR_SLOT(150) + FOOTER_H(90)
    const cm     = CHART_W_CM * (pxH / 1200);
    return Math.round(cm * EMU_PER_CM);
}

// Fallback for callers that don't know the bar count
const CHART_H = chartHeightEmu(4);

// ─── XML namespaces ───────────────────────────────────────────────────────────
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

function rPr({ bold = false, italic = false, color = C.black, size = 18, font = 'Arial' } = {}) {
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

function pPr({ align = '', spaceBefore = 0, spaceAfter = 40, borderBottom = '', borderTop = '', indLeft = 0 } = {}) {
    let xml = `<w:pPr>`;
    xml += `<w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}" w:line="240" w:lineRule="auto"/>`;
    if (align)   xml += `<w:jc w:val="${align}"/>`;
    if (indLeft) xml += `<w:ind w:left="${indLeft}"/>`;
    if (borderBottom || borderTop) {
        xml += `<w:pBdr>`;
        if (borderTop)    xml += `<w:top    w:val="single" w:sz="4" w:space="1" w:color="${borderTop}"/>`;
        if (borderBottom) xml += `<w:bottom w:val="single" w:sz="4" w:space="1" w:color="${borderBottom}"/>`;
        xml += `</w:pBdr>`;
    }
    xml += `</w:pPr>`;
    return xml;
}

function p(children, pprOpts = {}) {
    return `<w:p>${pPr(pprOpts)}${children}</w:p>`;
}

function spacer(twips = 60) {
    return `<w:p><w:pPr><w:spacing w:before="0" w:after="${twips}"/></w:pPr></w:p>`;
}

function pageBreak() {
    return `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>`
        + `<w:r><w:br w:type="page"/></w:r></w:p>`;
}

// ─── Table helpers ────────────────────────────────────────────────────────────

function tcPr({ width = 0, fill = C.white, borders = true, vAlign = 'top', pad = '60:100:60:100', span = 0 } = {}) {
    const [t, l, b, r] = pad.split(':').map(Number);
    const hairline = `w:val="single" w:sz="2" w:space="0" w:color="${C.border}"`;
    const none     = `w:val="none"   w:sz="0" w:space="0" w:color="auto"`;
    const bval = borders
        ? `<w:top ${hairline}/><w:left ${hairline}/><w:bottom ${hairline}/><w:right ${hairline}/>`
        : `<w:top ${none}/><w:left ${none}/><w:bottom ${none}/><w:right ${none}/>`;
    return `<w:tcPr>`
        + (width      ? `<w:tcW w:w="${width}" w:type="dxa"/>` : '')
        + (span > 1   ? `<w:gridSpan w:val="${span}"/>`        : '')
        + `<w:tcBorders>${bval}</w:tcBorders>`
        + `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>`
        + `<w:tcMar>`
        + `<w:top w:w="${t}" w:type="dxa"/><w:left w:w="${l}" w:type="dxa"/>`
        + `<w:bottom w:w="${b}" w:type="dxa"/><w:right w:w="${r}" w:type="dxa"/>`
        + `</w:tcMar>`
        + `<w:vAlign w:val="${vAlign}"/>`
        + `</w:tcPr>`;
}

function tc(children, tcOpts = {}) {
    return `<w:tc>${tcPr(tcOpts)}${children}</w:tc>`;
}

function tr(cells, height = 300) {
    return `<w:tr><w:trPr><w:trHeight w:val="${height}" w:hRule="atLeast"/></w:trPr>${cells}</w:tr>`;
}

function tbl(rows, cols, totalWidth = 9360) {
    const gridCols = cols.map(w => `<w:gridCol w:w="${w}"/>`).join('');
    const hair = `w:val="single" w:sz="2" w:space="0" w:color="${C.border}"`;
    return `<w:tbl>`
        + `<w:tblPr>`
        + `<w:tblW w:w="${totalWidth}" w:type="dxa"/>`
        + `<w:tblBorders>`
        + `<w:top    ${hair}/><w:left  ${hair}/><w:bottom ${hair}/><w:right ${hair}/>`
        + `<w:insideH ${hair}/><w:insideV ${hair}/>`
        + `</w:tblBorders>`
        + `<w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar>`
        + `</w:tblPr>`
        + `<w:tblGrid>${gridCols}</w:tblGrid>`
        + rows
        + `</w:tbl>`;
}

// ─── Image drawing XML (inline, compact) ──────────────────────────────────────

function drawingInline(rId, imgId, w = CHART_W, h = CHART_H) {
    const NS_A   = 'http://schemas.openxmlformats.org/drawingml/2006/main';
    const NS_PIC = 'http://schemas.openxmlformats.org/drawingml/2006/picture';
    const NS_R   = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    return `<w:drawing>`
        + `<wp:inline distT="0" distB="57150" distL="0" distR="0">`
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
    // Executive cover: plain centered text, no colored fill
    return p(run('UNIVERSIDAD DEL PUTUMAYO', { bold: true, size: 32, color: C.accent }), {
        align: 'center', spaceAfter: 20,
    })
    + p(run(subtitle, { size: 22, color: C.gray }), {
        align: 'center', spaceAfter: 0, borderBottom: C.border,
    });
}

function infoRow(label, value) {
    return tr(
        tc(p(run(label, { bold: true, size: 17, color: C.gray }), { spaceAfter: 20 }),
            { width: 2800, fill: C.lgray, pad: '60:100:60:100' })
        + tc(p(run(value ?? '—', { size: 17, color: C.black }), { spaceAfter: 20 }),
            { width: 6560, fill: C.white, pad: '60:100:60:100' }),
        280
    );
}

function infoTable(rows) {
    return tbl(rows.map(([l, v]) => infoRow(l, v)).join(''), [2800, 6560]);
}

function sectionHeading(text) {
    // Plain text heading with thin green underline — no fill
    return p(
        run(text.toUpperCase(), { bold: true, size: 19, color: C.accent }),
        { spaceBefore: 160, spaceAfter: 80, borderBottom: C.accent }
    );
}


function noteColor(val) {
    // Returns true when the value is passing (≥3.0) to trigger accent color — no red/orange/amber
    const n = Number(val);
    if (!Number.isFinite(n)) return false;
    return n >= 3.0;
}

function fmtNota(val) {
    const n = Number(val);
    return Number.isFinite(n) ? n.toFixed(2) : '—';
}

// ─── Aspectos table ───────────────────────────────────────────────────────────

function aspectosTableXml(aspectos = []) {
    if (!aspectos.length) return '';

    // Header row: bold labels, no fill — just a bottom border distinguishes it
    const headerRow = tr(
        tc(p(run('Aspecto evaluado', { bold: true, size: 17, color: C.gray }), { spaceAfter: 20 }),
            { fill: C.lgray, width: 5616, pad: '60:100:60:100' })
        + tc(p(run('Promedio', { bold: true, size: 17, color: C.gray }), { align: 'center', spaceAfter: 20 }),
            { fill: C.lgray, width: 1872, pad: '60:100:60:100' })
        + tc(p(run('Respuestas', { bold: true, size: 17, color: C.gray }), { align: 'center', spaceAfter: 20 }),
            { fill: C.lgray, width: 1872, pad: '60:100:60:100' }),
        280
    );

    const dataRows = aspectos.map((a, i) => {
        const fill = i % 2 === 0 ? C.white : C.lgray;
        const prom = Number(a.promedio ?? a.promedio_general ?? 0);
        const passing = noteColor(prom);
        return tr(
            tc(p(run(a.nombre ?? a.aspecto_nombre ?? a.label ?? '—', { size: 17, color: C.black }), { spaceAfter: 20 }),
                { fill, width: 5616, pad: '60:100:60:100' })
            + tc(p(run(fmtNota(prom), { bold: true, size: 17, color: passing ? C.accent : C.black }), { align: 'center', spaceAfter: 20 }),
                { fill, width: 1872, pad: '60:100:60:100' })
            + tc(p(run(String(a.total_respuestas ?? a.total ?? '—'), { size: 16, color: C.dgray }), { align: 'center', spaceAfter: 20 }),
                { fill, width: 1872, pad: '60:100:60:100' }),
            280
        );
    });

    return tbl([headerRow, ...dataRows].join(''), [5616, 1872, 1872]);
}

// ─── Materia results table ────────────────────────────────────────────────────

// Returns the three content blocks (fortalezas, debilidades, conclusión) for one cmtAi entry.
function aiCells(cmtAi) {
    const forts = Array.isArray(cmtAi?.fortaleza) ? cmtAi.fortaleza.filter(Boolean) : [];
    const debs  = Array.isArray(cmtAi?.debilidad)  ? cmtAi.debilidad.filter(Boolean)  : [];
    const conc  = cmtAi?.conclusion ?? '';

    const fortsXml = forts.length
        ? forts.map(f => p(run(`• ${f}`, { size: 16, color: C.black }), { spaceAfter: 14 })).join('')
        : p(run('Sin registros.', { italic: true, size: 16, color: C.dgray }), { spaceAfter: 0 });

    const debsXml = debs.length
        ? debs.map(d => p(run(`• ${d}`, { size: 16, color: C.black }), { spaceAfter: 14 })).join('')
        : p(run('Sin registros.', { italic: true, size: 16, color: C.dgray }), { spaceAfter: 0 });

    const concXml = conc
        ? p(run(conc, { size: 16, color: C.black }), { spaceAfter: 0 })
        : p(run('Sin análisis.', { italic: true, size: 16, color: C.dgray }), { spaceAfter: 0 });

    return { fortsXml, debsXml, concXml };
}

function materiaTableXml(materia, cmtAiMap) {
    const notaM      = materia.eval?.nota_final_ponderada ?? materia.promedio;
    const grupos     = materia.grupos ?? [];
    const multiGroup = grupos.length > 1;

    const nombre = materia.nombre_materia || materia.codigo_materia;
    const header = nombre
        + (materia.nombre_materia && materia.codigo_materia ? `  (${materia.codigo_materia})` : '')
        + (Number.isFinite(Number(notaM)) ? `   ·   Nota: ${fmtNota(notaM)}` : '');

    // Column widths
    // Multi-group:  [Grupo 900] [Fortalezas 2820] [Mejoras 2820] [Conclusión 2820]  = 9360
    // Single-group: [Fortalezas 3120] [Mejoras 3120] [Conclusión 3120]              = 9360
    const colCount = multiGroup ? 4 : 3;
    const cols     = multiGroup ? [900, 2820, 2820, 2820] : [3120, 3120, 3120];

    let rows = '';

    // ── Materia banner (spans all columns) ───────────────────────────────────
    rows += tr(
        tc(
            p(run(header, { bold: true, size: 19, color: C.white }), { spaceAfter: 0 }),
            { fill: C.accent, borders: false, pad: '80:140:80:140', span: colCount }
        ),
        360
    );

    // ── Column headers ────────────────────────────────────────────────────────
    const colHdrStyle = { bold: true, size: 16, color: C.gray };
    const colHdrPpr   = { spaceAfter: 0 };
    const colHdrFill  = 'EFEFEF';
    const colHdrPad   = '60:100:60:100';

    if (multiGroup) {
        rows += tr(
            tc(p(run('Grupo',             colHdrStyle), colHdrPpr), { fill: colHdrFill, width:  900, pad: colHdrPad })
            + tc(p(run('Fortalezas',      colHdrStyle), colHdrPpr), { fill: colHdrFill, width: 2820, pad: colHdrPad })
            + tc(p(run('Oport. de mejora',colHdrStyle), colHdrPpr), { fill: colHdrFill, width: 2820, pad: colHdrPad })
            + tc(p(run('Conclusión',      colHdrStyle), colHdrPpr), { fill: colHdrFill, width: 2820, pad: colHdrPad }),
            280
        );
    } else {
        rows += tr(
            tc(p(run('Fortalezas',       colHdrStyle), colHdrPpr), { fill: colHdrFill, width: 3120, pad: colHdrPad })
            + tc(p(run('Oport. de mejora',colHdrStyle), colHdrPpr), { fill: colHdrFill, width: 3120, pad: colHdrPad })
            + tc(p(run('Conclusión',      colHdrStyle), colHdrPpr), { fill: colHdrFill, width: 3120, pad: colHdrPad }),
            280
        );
    }

    // ── Per-group data rows ───────────────────────────────────────────────────
    grupos.forEach((g, i) => {
        const rowFill  = i % 2 === 0 ? C.white : C.lgray;
        const grupoKey = `${materia.codigo_materia}|${g.grupo}`;
        const cmtAi    = cmtAiMap?.get(grupoKey);
        const notaG    = g.eval?.nota_final_ponderada ?? g.promedio;
        const { fortsXml, debsXml, concXml } = aiCells(cmtAi);
        const grupoName = grupos.length === 1 ? 'Grupo A' : `Grupo ${g.grupo ?? 'A'}`;

        if (multiGroup) {
            rows += tr(
                tc(
                    p(run(grupoName, { bold: true, size: 16, color: C.black }),   { spaceAfter: 8 })
                    + (Number.isFinite(Number(notaG))
                        ? p(run(fmtNota(notaG), { bold: true, size: 18, color: noteColor(notaG) ? C.accent : C.black }), { spaceAfter: 0 })
                        : ''),
                    { fill: rowFill, width: 900, pad: '60:80:60:80', vAlign: 'top' }
                )
                + tc(fortsXml, { fill: rowFill, width: 2820, pad: '60:100:60:100', vAlign: 'top' })
                + tc(debsXml,  { fill: rowFill, width: 2820, pad: '60:100:60:100', vAlign: 'top' })
                + tc(concXml,  { fill: rowFill, width: 2820, pad: '60:100:60:100', vAlign: 'top' })
            );
        } else {
            rows += tr(
                tc(fortsXml, { fill: C.white, width: 3120, pad: '60:100:60:100', vAlign: 'top' })
                + tc(debsXml,  { fill: C.white, width: 3120, pad: '60:100:60:100', vAlign: 'top' })
                + tc(concXml,  { fill: C.white, width: 3120, pad: '60:100:60:100', vAlign: 'top' })
            );
        }
    });

    // ── Consolidated row (multi-group only) ───────────────────────────────────
    if (multiGroup) {
        const consolidado = cmtAiMap?.get(`${materia.codigo_materia}|null`);
        // Separator label spanning all columns
        rows += tr(
            tc(
                p(run('Análisis consolidado — todos los grupos', { bold: true, size: 16, color: C.gray }), { spaceAfter: 0 }),
                { fill: 'E8EDE8', borders: true, pad: '60:140:60:140', span: colCount }
            ),
            280
        );
        // Consolidated content (grupo cell says "Consol.")
        const { fortsXml, debsXml, concXml } = aiCells(consolidado ?? null);
        rows += tr(
            tc(
                p(run('Consol.', { bold: true, size: 15, color: C.gray }), { spaceAfter: 0 }),
                { fill: C.white, width: 900, pad: '60:80:60:80', vAlign: 'top' }
            )
            + tc(fortsXml, { fill: C.white, width: 2820, pad: '60:100:60:100', vAlign: 'top' })
            + tc(debsXml,  { fill: C.white, width: 2820, pad: '60:100:60:100', vAlign: 'top' })
            + tc(concXml,  { fill: C.white, width: 2820, pad: '60:100:60:100', vAlign: 'top' })
        );
    }

    return tbl(rows, cols) + spacer(60);
}

// ─── Docente section ──────────────────────────────────────────────────────────

function docenteSection(d, isFirst, chartRid, imgId) {
    let xml = isFirst ? '' : pageBreak();

    // Docente heading: large bold text + thick bottom rule, no fill
    const nombre = d.nombre_docente || d.docente || '';
    const cc     = d.docente ? `CC ${d.docente}` : '';
    xml += p(
        run(nombre, { bold: true, size: 28, color: C.black }),
        { spaceBefore: 0, spaceAfter: 12, borderBottom: C.accent }
    );
    if (cc) {
        xml += p(run(cc, { size: 17, color: C.dgray }), { spaceAfter: 60 });
    }

    // Summary row
    const notaFinal = d.nota_final ?? d.aspectos?.resultado_final?.nota_final_ponderada;
    const totalResp = d.aspectos?.evaluacion_estudiantes?.total_respuestas ?? '—';
    const totalCmt  = d.aspectos?.evaluacion_estudiantes?.total_cmt ?? '—';

    xml += infoTable([
        ['Nota final ponderada:', fmtNota(notaFinal)],
        ['Total respuestas:',     String(totalResp)],
        ['Total con comentario:', String(totalCmt)],
    ]);
    xml += spacer(60);

    // Resultados por aspecto
    const aspectosArr = d.aspectos?.evaluacion_estudiantes?.aspectos ?? [];
    if (aspectosArr.length) {
        xml += sectionHeading('Resultados por Aspecto');
        if (chartRid) {
            const cH = chartHeightEmu(d.chartBarCount ?? aspectosArr.length);
            xml += `<w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="60" w:after="80"/></w:pPr>`
                + `<w:r>${drawingInline(chartRid, imgId, CHART_W, cH)}</w:r></w:p>`;
        }
        xml += aspectosTableXml(aspectosArr);
        xml += spacer(60);
    }

    // Resultados por materia
    const materias = d.materias ?? [];
    if (materias.length) {
        xml += sectionHeading('Resultados por Materia');
        for (const materia of materias) {
            xml += materiaTableXml(materia, d.cmtAiMap);
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
        + spacer(80)
        + infoTable(rows)
        + spacer(80);
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
    const relsXml      = zip.file('word/_rels/document.xml.rels')?.asText() ?? '';
    const headerMatch  = relsXml.match(/Id="(rId\d+)"[^>]*[Hh]eader/);
    const headerRid    = headerMatch?.[1] ?? 'rId1';
    const existingNums = [...relsXml.matchAll(/rId(\d+)/g)].map(m => parseInt(m[1]));
    let   nextRidNum   = Math.max(0, ...existingNums) + 1;

    // Add chart images for each docente; collect rId assignments
    const newRels  = [];
    const chartRids = [];

    for (const d of ctx.docentes) {
        if (d.chartImage) {
            const base64  = d.chartImage.replace(/^data:image\/png;base64,/, '');
            const imgBuf  = Buffer.from(base64, 'base64');
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
        + `<w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="709" w:footer="709" w:gutter="0"/>`
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
