import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parseHTML } from 'linkedom';

class Component {
  constructor() { this._children=[];this.cleanups=[]; }
  addChild(child) {this._children.push(child);return child;}
  removeChild(child) {this._children=this._children.filter(c=>c!==child);child.unload();}
  register(fn) {this.cleanups.push(fn);}
  registerEvent(event) {this.register(()=>event.dispose());}
  registerDomEvent(el,type,fn) {el.addEventListener(type,fn);this.register(()=>el.removeEventListener(type,fn));}
  unload() {for(const child of this._children)child.unload();for(const cleanup of this.cleanups.reverse())cleanup();this.onunload?.();}
}
class TFile {constructor(path) {this.path=path;this.extension='md';}}
class StringValue {constructor(data) {this.data=data;}toString(){return this.data;}renderTo(el){el.textContent=this.data;}}
class FileValue {constructor(file){this.file=file;}}
class QueryController extends Component {constructor(onFileChanged){super();this.queue={onFileChanged};}}
function events() {
  const handlers=new Map();
  return {on(name,fn){let list=handlers.get(name);if(!list)handlers.set(name,list=new Set());list.add(fn);return{dispose(){list.delete(fn);}};},emit(name,...args){for(const fn of handlers.get(name)??[])fn(...args);}};
}
function fixture() {
  const {document,window}=parseHTML('<html><body><div id="view"></div></body></html>');
  const proto=window.HTMLElement.prototype;
  proto.createEl=function(tag,options={}){const el=document.createElement(tag);if(options.cls)el.className=options.cls;if(options.text!==undefined)el.textContent=options.text;for(const [k,v]of Object.entries(options.attr??{}))el.setAttribute(k,v);this.appendChild(el);return el;};
  proto.createDiv=function(options={}){return this.createEl('div',typeof options==='string'?{cls:options}:options);};
  proto.empty=function(){this.replaceChildren();};proto.addClass=function(...classes){this.classList.add(...classes);};proto.setText=function(text){this.textContent=text;};
  const file=new TFile('notes/Source.md');let content='## About\n**First** ![[Media]]';
  const changed=[],opened=[],rendered=[],notices=[];
  const controller=new QueryController(f=>changed.push(f.path));
  const vaultEvents=events();
  const app={
    vault:{...vaultEvents,cachedRead:async()=>content,getFileByPath:p=>p===file.path?file:null,getMarkdownFiles:()=>[file]},
    metadataCache:{getFileCache:()=>({referenceLinks:[{id:'local',link:'./Other.md'}]})},
    workspace:{...events(),iterateAllLeaves:fn=>fn({view:{_children:[controller]}}),openLinkText:async(...args)=>opened.push(args),trigger(){}},
  };
  class Plugin extends Component {
    constructor(){super();this.app=app;}
    async loadData(){return null;}async saveData(data){this.saved=data;}
    registerGlobalFunc(fn){this.formula=fn;this.register(()=>this.formula=null);}
    registerBasesView(){throw Error('Excerpts must not register its own view');}
    addSettingTab(){}
  }
  const obsidian={Plugin,Component,TFile,StringValue,FileValue,QueryController,Notice:class{constructor(text){notices.push(text);}},PluginSettingTab:class{},Setting:class{},Keymap:{isModEvent:e=>e.button===1||e.ctrlKey},MarkdownRenderer:{async render(_app,text,el,sourcePath,owner){rendered.push({text,sourcePath,owner});el.createEl('a',{cls:'internal-link',text:'Other',attr:{'data-href':'./Other.md',href:'./Other.md'}});}}};
  const module={exports:{}};
  vm.runInNewContext(fs.readFileSync(new URL('../dist/main.js',import.meta.url),'utf8'),{module,exports:module.exports,require:()=>obsidian,window:{setTimeout,clearTimeout},console});
  const plugin=new module.exports.default();
  return {plugin,app,file,controller,document,window,changed,opened,rendered,notices,setContent:text=>content=text,FileValue};
}
const delay=()=>new Promise(resolve=>setTimeout(resolve,70));

test('async completion requeues an initially empty formula, including excluded rows', async () => {
  const f=fixture();await f.plugin.onload();
  const source=new f.FileValue(f.file);
  const first=f.plugin.formula.applyWithContext({},source,null);
  assert.equal(first.toString(),'');assert.equal(f.plugin.formula.ctx,null);
  await delay();assert.deepEqual(f.changed,['notes/Source.md']);
  assert.equal(f.plugin.formula.apply(source,null).toString(),'**First** ![[Media]]');
  f.setContent('## About\nChanged');f.app.vault.emit('modify',f.file);await delay();
  assert.equal(f.plugin.formula.apply(source,null).toString(),'Changed');assert.equal(f.changed.length,2);
  f.plugin.unload();assert.equal(f.plugin.formula,null);
});
test('heading settings invalidate dependent formulas and missing source yields empty', async () => {
  const f=fixture();await f.plugin.onload();
  assert.equal(f.plugin.formula.apply(null,null).toString(),'');
  f.setContent('## About\nFirst\n## Other\nSecond');
  await f.plugin.setHeading('## Other');
  const source=new f.FileValue(f.file);f.plugin.formula.apply(source,null);await delay();
  assert.equal(f.plugin.formula.apply(source,null).toString(),'Second');
  assert.equal(f.plugin.saved.heading,'## Other');f.plugin.unload();
});
test('formula render hook works without a custom view and keeps source-relative links', async () => {
  const f=fixture();await f.plugin.onload();const source=new f.FileValue(f.file);
  f.plugin.formula.apply(source,null);await delay();
  const value=f.plugin.formula.apply(source,null);
  const cell=f.document.getElementById('view');
  value.renderTo(cell,{});
  assert.equal(f.rendered.length,1);assert.equal(f.rendered[0].sourcePath,'notes/Source.md');
  assert.equal(f.rendered[0].text,'**First** [[Media]]\n\n[local]: <./Other.md>');
  const link=f.document.querySelector('a');const click=new f.window.Event('click',{bubbles:true,cancelable:true});click.button=0;link.dispatchEvent(click);
  assert.deepEqual(f.opened,[['./Other.md','notes/Source.md',undefined]]);
  value.renderTo(cell,{});assert.equal(f.plugin.renderer.records.size,1);
  f.plugin.unload();assert.equal(cell.textContent,'**First** ![[Media]]');
  assert.equal(f.plugin.renderer.records.size,0);
});
test('shows one compatibility notice if a discovered Bases controller cannot refresh', async () => {
  const f=fixture();f.controller.queue={};await f.plugin.onload();f.plugin.formula.apply(new f.FileValue(f.file),null);await delay();
  assert.equal(f.notices.length,1);f.setContent('## About\nChanged');f.app.vault.emit('modify',f.file);await delay();assert.equal(f.notices.length,1);f.plugin.unload();
});

test('deletion cancels an already scheduled refresh so no deleted file is requeued', async () => {
  const f=fixture();await f.plugin.onload();f.plugin.scheduleRefresh(f.file);
  f.app.vault.emit('delete',f.file);await delay();assert.deepEqual(f.changed,[]);f.plugin.unload();
});

test('recycled and detached cells release Markdown children and link listeners', async () => {
  const f=fixture();await f.plugin.onload();const source=new f.FileValue(f.file);
  f.plugin.formula.apply(source,null);await delay();const value=f.plugin.formula.apply(source,null);
  const cell=f.document.getElementById('view');value.renderTo(cell,{});
  const oldLink=cell.querySelector('a');cell.empty();await delay();
  assert.equal(f.plugin.renderer.records.size,0);assert.equal(f.plugin._children.length,0);
  const click=new f.window.Event('click',{bubbles:true,cancelable:true});click.button=0;oldLink.dispatchEvent(click);assert.equal(f.opened.length,0);
  const detached=f.document.createElement('div');value.renderTo(detached,{});cell.appendChild(detached);await delay();
  assert.equal(f.plugin.renderer.records.size,1);detached.remove();await delay();
  assert.equal(f.plugin.renderer.records.size,0);f.plugin.unload();
});

test('middle clicks and hover previews retain the source note context', async () => {
  const f=fixture();const hover=[];f.app.workspace.trigger=(...args)=>hover.push(args);await f.plugin.onload();
  const source=new f.FileValue(f.file);f.plugin.formula.apply(source,null);await delay();
  const value=f.plugin.formula.apply(source,null);const cell=f.document.getElementById('view');const context={};value.renderTo(cell,context);
  const link=cell.querySelector('a');const click=new f.window.Event('auxclick',{bubbles:true,cancelable:true});click.button=1;link.dispatchEvent(click);
  assert.deepEqual(f.opened,[['./Other.md','notes/Source.md',true]]);
  link.dispatchEvent(new f.window.Event('mouseover',{bubbles:true}));assert.equal(hover[0][1].sourcePath,'notes/Source.md');assert.equal(hover[0][1].hoverParent,context);
  f.plugin.unload();
});

test('equal text from different source notes requires rerendering links', async () => {
  const f=fixture();await f.plugin.onload();const source=new f.FileValue(f.file);f.plugin.formula.apply(source,null);await delay();
  const first=f.plugin.formula.apply(source,null);const other=new first.constructor(first.data,'different/Source.md',f.plugin.renderer);
  assert.equal(first.equals(other),false);assert.equal(first.equals(f.plugin.formula.apply(source,null)),true);f.plugin.unload();
});

test('closing a document releases its renderers and observers', async () => {
  const f=fixture();await f.plugin.onload();const source=new f.FileValue(f.file);f.plugin.formula.apply(source,null);await delay();
  f.plugin.formula.apply(source,null).renderTo(f.document.getElementById('view'),{});
  f.app.workspace.emit('window-close',{}, {document:f.document});
  assert.equal(f.plugin.renderer.documents.size,0);assert.equal(f.plugin.renderer.records.size,0);assert.equal(f.plugin._children.length,0);f.plugin.unload();
});
