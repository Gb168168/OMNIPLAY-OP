#!/usr/bin/env python3
"""Fetch public API reference data. Never reads or writes customer explanations."""
import concurrent.futures, hashlib, json, os, re, sys, urllib.error, urllib.request, urllib.parse
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
ORIGIN='https://docs.jigaming777.com'
PATHS={'revision':'revisionHistory'}
for n in [1,2,3,4,11]: PATHS[str(n)]=f'providedToUs/action/action{n}'
for n in [21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,41,42,43,44,45,46,47]: PATHS[str(n)]=f'providedByUs/action/action{n}'
for n in [72,73,74]: PATHS[str(n)]=f'providedByUs/jackpotAction/action{n}'
for n in [104,105,106,107]: PATHS[str(n)]=f'providedByUs/cardAction/action{n}'
class Node:
 def __init__(self,tag='',attrs=None):self.tag=tag;self.attrs=dict(attrs or []);self.children=[]
 def text(self):return ''.join(x.text() if isinstance(x,Node) else x for x in self.children)
 def find(self,tag):
  if self.tag==tag:return self
  for x in self.children:
   if isinstance(x,Node):
    found=x.find(tag)
    if found:return found
 def all(self,tag):
  if self.tag==tag:yield self
  for x in self.children:
   if isinstance(x,Node):yield from x.all(tag)
class Parser(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.root=Node();self.stack=[self.root]
 def handle_starttag(self,tag,attrs):
  n=Node(tag,attrs);self.stack[-1].children.append(n)
  if tag not in ['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']:self.stack.append(n)
 def handle_endtag(self,tag):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i].tag==tag:del self.stack[i:];break
 def handle_data(self,text):self.stack[-1].children.append(text)
def clean(s):return re.sub(r'\s+',' ',s).strip()
def extract(html,action):
 p=Parser();p.feed(html);main=p.root.find('main')
 if not main:raise ValueError('Document main section missing')
 blocks=[];fields={}
 def walk(n):
  if not isinstance(n,Node):return
  if n.tag in ['script','style','svg','nav','footer'] or 'nextra-breadcrumb' in n.attrs.get('class',''):return
  if re.fullmatch('h[1-4]',n.tag):
   text=clean(n.text()).rstrip('#').strip();blocks.append({'kind':'heading','level':int(n.tag[1]),'text':text});return
  if n.tag=='table':
   rows=[]
   for tr in n.all('tr'):
    cells=[]
    for cell in tr.children:
     if isinstance(cell,Node) and cell.tag in ['th','td']:
      cells.append({'text':clean(cell.text()),'header':cell.tag=='th','colspan':max(1,min(64,int(cell.attrs.get('colspan','1')))),'rowspan':max(1,min(64,int(cell.attrs.get('rowspan','1'))))})
    if cells:rows.append(cells)
   if rows:blocks.append({'kind':'table','rows':rows})
   for row in rows[1:]:
    if len(row)>1 and re.fullmatch(r'[A-Za-z][\w.\[\]-]{0,79}',row[0]['text']) and re.match(r'^(String|Integer|Double|Float|Long|Boolean|DateTime|UnixTime|Decimal|Number|Array|Object|Int)',row[1]['text'],re.I):fields[row[0]['text']]={'name':row[0]['text'],'type':row[1]['text'],'required':row[2]['text'] if len(row)>=4 else '', 'description':row[-1]['text']}
   return
  if n.tag in ['ul','ol']:
   items=[clean(x.text()) for x in n.children if isinstance(x,Node) and x.tag=='li'];
   if items:blocks.append({'kind':'list','ordered':n.tag=='ol','items':items})
   return
  if n.tag=='pre':blocks.append({'kind':'code','text':n.text().strip()});return
  if n.tag=='p':
   text=clean(n.text())
   if text:blocks.append({'kind':'paragraph','text':text})
   return
  for child in n.children:walk(child)
 walk(main)
 title=next((b['text'] for b in blocks if b['kind']=='heading' and b['level']==1),'')
 if not title or (action.isdigit() and not re.search(r'Action\s*'+re.escape(action)+r'\b',title,re.I)):raise ValueError('Unexpected document title')
 if action.isdigit() and not fields:raise ValueError('API parameter table missing')
 if len(blocks)<2:raise ValueError('Incomplete document')
 return {'title':title,'blocks':blocks,'fields':list(fields.values())}
def fetch_page(lang,action,path,previous,stamp):
 url=f'{ORIGIN}/{lang}/integration/{path}';headers={'User-Agent':'OMNIPLAY-Documentation-Sync/1.0','Accept':'text/html'}
 if previous.get('etag'):headers['If-None-Match']=previous['etag']
 try:
  with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=35) as response:
   if not response.url.startswith(ORIGIN+'/'):raise ValueError('Unexpected redirect origin')
   html=response.read(3000000).decode('utf-8');data=extract(html,action);data.update({'url':url,'etag':response.headers.get('ETag',''),'lastChecked':stamp})
 except urllib.error.HTTPError as error:
  if error.code==304 and previous.get('blocks'):return {**previous,'lastChecked':stamp},None
  raise
 digest=hashlib.sha256(json.dumps(data['blocks'],ensure_ascii=False,sort_keys=True).encode()).hexdigest();data['hash']=digest;data['updatedAt']=previous.get('updatedAt',stamp) if previous.get('hash')==digest else stamp
 old_names={f['name'] for f in previous.get('fields',[])};names={f['name'] for f in data['fields']}
 change={'removed':sorted(old_names-names),'added':sorted(names-old_names),'changed':previous.get('hash') not in [None,digest]}
 return data,change
def sync(target):
 # Discover newly added Actions only from same-origin documentation navigation.
 with urllib.request.urlopen(ORIGIN+'/zh/integration/revisionHistory',timeout=35) as response:
  parser=Parser();parser.feed(response.read(3000000).decode('utf-8'))
  for anchor in parser.root.all('a'):
   url=urllib.parse.urljoin(ORIGIN,anchor.attrs.get('href',''));parts=urllib.parse.urlparse(url)
   match=re.fullmatch(r'/zh/integration/(provided(?:ByUs|ToUs)/(?:action|cardAction|jackpotAction)/action(\d+))/?',parts.path)
   if parts.scheme=='https' and parts.netloc=='docs.jigaming777.com':
    if match:PATHS[match[2]]=match[1]
    else:
     general=re.fullmatch(r'/zh/integration/([A-Za-z0-9_/]+)/?',parts.path)
     if general:
      path=general[1].rstrip('/');key='revision' if path=='revisionHistory' else path.replace('/','_')
      PATHS[key]=path
 stamp=datetime.now(timezone.utc).isoformat(timespec='seconds');old=json.loads(target.read_text()) if target.exists() else {};pages=dict(old.get('pages',{}));failures=[];changes=[]
 def job(lang,action,path):
  key=lang+':'+action;prior=pages.get(key,{})
  try:return key,*fetch_page(lang,action,path,prior,stamp)
  except Exception as error:return key,None,{'error':str(error)[:250]}
 with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
  jobs=[pool.submit(job,lang,action,path) for lang in ['zh','en'] for action,path in PATHS.items()]
  for task in concurrent.futures.as_completed(jobs):
   key,data,change=task.result()
   if data:
    pages[key]=data
    if change and change['changed']:changes.append({'page':key,**change})
   else:failures.append({'page':key,**change})
 expected=[lang+':'+key for lang in ['zh','en'] for key in PATHS]
 missing=[key for key in expected if key not in pages]
 if missing:raise RuntimeError('No valid previous copy for: '+', '.join(missing))
 output={'version':1,'lastChecked':stamp,'lastSuccessfulSync':stamp if not failures else old.get('lastSuccessfulSync'),'pages':pages,'failures':failures,'changes':changes or old.get('changes',[])}
 target.parent.mkdir(parents=True,exist_ok=True);temp=target.with_suffix('.tmp');temp.write_text(json.dumps(output,ensure_ascii=False,separators=(',',':'))+'\n');os.replace(temp,target)
 print(json.dumps({'pages':len(pages),'updated':len(changes),'failed':len(failures),'lastChecked':stamp}))
 if failures:print('Some source pages failed; previous valid copies retained.',file=sys.stderr)
if __name__=='__main__':sync(Path(__file__).resolve().parents[1]/'api-docs'/'snapshot.json')
