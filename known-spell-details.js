import {SPELLS,BOOKS} from './catalog.js';
const spellsById=new Map(SPELLS.map(s=>[s.id,s]));
export function textFingerprint(text){let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16).padStart(8,'0');}
export function knownSpellDetails(spell){
 const catalog=spellsById.get(spell.catalogId),stored=spell.description||'',reference=/^(.+?), p\. (\d+) \(PDF (\d+)\)\r?\n/.exec(stored);
 let description=stored;if(reference){const start=stored.indexOf('\n\n');description=start>=0?stored.slice(start+2):stored.slice(reference[0].length);}
 // Refresh only the original catalog copy. Personal edits remain intact.
 if(catalog&&(textFingerprint(description)===catalog.legacyTextHash||description===catalog.description))description=catalog.description;
 return {description,school:catalog?.school||'',book:catalog?BOOKS[catalog.source]:reference?.[1]||'',page:catalog?.page||(reference?Number(reference[2]):null),pdfPage:catalog?.pdfPage||(reference?Number(reference[3]):null)};
}
export function spellReference(info){return info.book?`${info.book} · livro p. ${info.page} · PDF p. ${info.pdfPage}`:'Referência não informada';}
export function renderSpellDescription(info,esc){return info.description.split(/\n\s*\n/).map(paragraph=>`<div class="spell-detail-paragraph">${paragraph.split('\n').map(line=>{if(info.school&&line.trim()===info.school.trim())return `<div class="spell-detail-line"><strong>Escola:</strong> ${esc(line)}</div>`;const m=/^([^:\n]{2,45}):\s*(.*)$/.exec(line);return m?`<div class="spell-detail-line"><strong>${esc(m[1])}:</strong> ${esc(m[2])}</div>`:`<div>${esc(line)}</div>`;}).join('')}</div>`).join('');}
