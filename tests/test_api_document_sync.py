import copy, importlib.util, io, json, tempfile, unittest, urllib.error
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('sync',Path(__file__).resolve().parents[1]/'scripts/sync-api-docs.py')
sync=importlib.util.module_from_spec(spec);spec.loader.exec_module(sync)
HTML='<main><h1>Action 105: Cards</h1><h2>Request</h2><table><tr><th>Parameter</th><th>Type</th><th>Required</th><th>Description</th></tr><tr><td>expirationTime</td><td>DateTime</td><td>Y</td><td>Expiry</td></tr></table><script>private()</script></main>'
class Response(io.BytesIO):
 def __init__(self,text):super().__init__(text.encode());self.url=sync.ORIGIN+'/zh/integration/revisionHistory';self.headers={'ETag':'etag'}
 def __enter__(self):return self
 def __exit__(self,*args):self.close()
class SyncTests(unittest.TestCase):
 def test_parse_and_reject_invalid(self):
  page=sync.extract(HTML,'105');self.assertEqual(page['fields'][0]['name'],'expirationTime');self.assertNotIn('private()',json.dumps(page));
  for text in ['<main><h1>404</h1></main>','<main><h1>Action 105</h1><p>broken</p></main>']:
   with self.assertRaises(ValueError):sync.extract(text,'105')
 def test_not_modified_keeps_document(self):
  old={**sync.extract(HTML,'105'),'etag':'old','hash':'existing'}
  with patch.object(sync.urllib.request,'urlopen',side_effect=urllib.error.HTTPError('u',304,'same',{},None)):
   result,change=sync.fetch_page('zh','105','x',old,'now')
  self.assertEqual(result['fields'],old['fields']);self.assertEqual(result['hash'],'existing');self.assertIsNone(change)
 def test_failure_retains_last_valid_copy(self):
  oldpage={**sync.extract(HTML,'105'),'hash':'existing'};old={'pages':{'zh:105':oldpage,'en:105':copy.deepcopy(oldpage)},'lastSuccessfulSync':'before'}
  with tempfile.TemporaryDirectory() as directory:
   target=Path(directory)/'snapshot.json';target.write_text(json.dumps(old))
   def fetch(lang,*args):
    if lang=='en':raise RuntimeError('upstream timeout')
    return {**oldpage,'lastChecked':'now'},None
   with patch.dict(sync.PATHS,{'105':'x'},clear=True),patch.object(sync.urllib.request,'urlopen',return_value=Response('<main></main>')),patch.object(sync,'fetch_page',side_effect=fetch):sync.sync(target)
   result=json.loads(target.read_text());self.assertEqual(result['pages']['en:105'],oldpage);self.assertEqual(result['lastSuccessfulSync'],'before');self.assertEqual(result['failures'][0]['page'],'en:105')
 def test_no_initial_copy_does_not_write_invalid_snapshot(self):
  with tempfile.TemporaryDirectory() as directory:
   target=Path(directory)/'snapshot.json'
   with patch.dict(sync.PATHS,{'105':'x'},clear=True),patch.object(sync.urllib.request,'urlopen',return_value=Response('<main></main>')),patch.object(sync,'fetch_page',side_effect=RuntimeError('timeout')):
    with self.assertRaises(RuntimeError):sync.sync(target)
   self.assertFalse(target.exists())
if __name__=='__main__':unittest.main()
