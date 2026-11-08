/* ---------- boot ---------- */
(async()=>{
  $('#app').innerHTML='<div class="page"><div class="wrap"><div class="skeleton" style="width:40%;height:34px;margin-top:40px"></div><div class="skeleton" style="margin-top:20px"></div><div class="skeleton" style="margin-top:12px;width:70%"></div></div></div>';
  try{await loadData();render()}catch(e){$('#app').innerHTML=`<div class="page"><div class="wrap"><div class="gate"><h1>Could not load data</h1><p>Open this site through a web server (see README) so the data files can be read.</p></div></div></div>`;console.error(e)}
})();
