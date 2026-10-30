import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../api-document-copy.js',import.meta.url),'utf8');
const {mountDocumentCopy}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const saved=JSON.parse(await readFile(new URL('../api-docs/snapshot.json',import.meta.url),'utf8'));
class Element {
 constructor(){this.children=[];this.style={setProperty(){}};this.scrollTop=0;this.innerHTML='';}
 setAttribute(){}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=items;}
 querySelectorAll(){return [];}
}
test('opening real documentation pages renders grouped navigation in both languages',()=>{
 const previous=globalThis.document;
 globalThis.document={querySelector:()=>({}),createElement:()=>new Element()};
 try{
  const snapshot={...saved,pages:Object.fromEntries(Object.entries(saved.pages).map(([key,page])=>[key,{...page,blocks:[]}]))};
  for(const language of ['zh','en']){
   const host=new Element();const view=mountDocumentCopy(host,{snapshot,language,onAction(){},onField(){}});
   for(const action of ['105','procedure_notice','sampleCode_java','appendix_error']){
    view.show(action);const html=host.children[0].innerHTML;
    assert.equal((html.match(/data-copy-action=/g)||[]).length,55);
    for(const id of ['procedure','providedToUs','providedByUs','providedToUs-actions','providedByUs-actions','providedByUs-jackpot','providedByUs-card','sampleCode','appendix'])
     assert.ok(html.includes('data-nav-group="'+id+'"'),id);
    assert.ok(html.includes('data-copy-action="'+action+'" aria-current="page"'));
   }
  }
 }finally{globalThis.document=previous;}
});
