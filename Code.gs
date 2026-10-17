/*
 * Protocolo Mentor — Backend (Google Apps Script)
 *
 * COMO CONFIGURAR (2 min):
 *   1. Abra a planilha (mesma já usada ou uma nova).
 *   2. Menu Extensões -> Apps Script.
 *   3. Apague tudo e cole TODO este arquivo.
 *   4. Clique em "Fazer deploy" -> "Novo deploy" -> tipo "Aplicativo da web".
 *      - Executar como: Eu
 *      - Quem tem acesso: Qualquer pessoa
 *   5. Copie a URL do aplicativo (termina com /exec).
 *   6. Cole no app (campo "URL do GAS" ou na Vercel como NEXT_PUBLIC_GAS_URL).
 *
 * A aba "Protocolo" é criada sozinha com o cabeçalho:
 *   id | data_protocolo | codigo_barras | tipo_doc | numero_doc | cliente_hospital | paciente | tipo_devolucao | observacao | status | usuario
 */

var SPREADSHEET_ID = '10pq8D-YI--QTtdNORlfZoAXDPrIxNEX2T_SnR2jRIKk';
var ABA = 'Protocolo';
var HEADER = ['id', 'data_protocolo', 'codigo_barras', 'tipo_doc', 'numero_doc', 'cliente_hospital', 'paciente', 'tipo_devolucao', 'observacao', 'status', 'usuario'];

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  var result;
  try {
    if (action === 'ping') {
      result = { success: true, mensagem: 'Protocolo Mentor online', versao: '2026-10-16-colado-rapido' };
    } else if (action === 'listar') {
      result = { success: true, dados: listarProtocolo() };
    } else if (action === 'salvar') {
      result = salvarProtocolo(e.parameter);
    } else if (action === 'editar') {
      result = editarProtocolo(e.parameter);
    } else if (action === 'excluir') {
      result = excluirProtocolo(e.parameter);
    } else if (action === 'buscar') {
      result = buscarColado(e.parameter);
    } else if (action === 'mapaColado') {
      result = mapaColado();
    } else {
      result = { success: false, mensagem: 'Acao nao reconhecida: ' + action };
    }
  } catch (err) {
    result = { success: false, mensagem: err.toString() };
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  // Aceita tanto querystring quanto JSON no body
  if (e && e.postData && e.postData.contents) {
    try {
      var body = JSON.parse(e.postData.contents);
      if (body && body.action) {
        var params = {};
        for (var k in body) params[k] = body[k];
        // reutiliza o roteamento do doGet
        var fake = { parameter: params };
        return doGet(fake);
      }
    } catch (err) { /* cai para doGet normal */ }
  }
  return doGet(e);
}

function getAba() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var aba = ss.getSheetByName(ABA);
  if (!aba) {
    aba = ss.insertSheet(ABA);
    aba.appendRow(HEADER);
    aba.setFrozenRows(1);
  } else {
    // garante cabeçalho correto na 1ª linha
    var primeira = aba.getRange(1, 1, 1, HEADER.length).getValues()[0];
    if (String(primeira[0] || '').toLowerCase() !== 'id') {
      aba.insertRowBefore(1);
      aba.getRange(1, 1, 1, HEADER.length).setValues([HEADER]);
    }
  }
  return aba;
}

function linhasParaObjetos() {
  var aba = getAba();
  var last = aba.getLastRow();
  if (last < 2) return [];
  var vals = aba.getRange(2, 1, last - 1, HEADER.length).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i];
    if (!r[0] && !r[4] && !r[5]) continue; // pula linhas vazias
    var dt = r[1];
    if (Object.prototype.toString.call(dt) === '[object Date]') {
      dt = Utilities.formatDate(dt, Session.getScriptTimeZone(), 'dd/MM/yyyy');
    } else {
      dt = String(dt || '');
    }
    out.push({
      id: String(r[0] || ''),
      data_protocolo: dt,
      codigo_barras: String(r[2] || ''),
      tipo_doc: String(r[3] || ''),
      numero_doc: String(r[4] || ''),
      cliente_hospital: String(r[5] || ''),
      paciente: String(r[6] || ''),
      tipo_devolucao: String(r[7] || ''),
      observacao: String(r[8] || ''),
      status: String(r[9] || ''),
      usuario: String(r[10] || ''),
      _linha: i + 2
    });
  }
  // mais recentes primeiro
  out.reverse();
  return out;
}

function listarProtocolo() {
  return linhasParaObjetos();
}

function novoId() {
  return 'P' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss') + Math.floor(Math.random() * 900 + 100);
}

function salvarProtocolo(d) {
  var numero = String((d && (d.numero_doc || d.numero || d.nota)) || '').trim();
  var cliente = String((d && (d.cliente_hospital || d.cliente)) || '').trim();
  if (!numero) return { success: false, mensagem: 'Campo Nota é obrigatório' };
  if (!cliente) return { success: false, mensagem: 'Campo Cliente/Hospital é obrigatório' };
  var tipoDev = String((d && (d.tipo_devolucao || d.tipoDevolucao)) || '').trim();
  if (!tipoDev) return { success: false, mensagem: 'Campo Tipo devolução é obrigatório' };

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var aba = getAba();
    var id = novoId();
    var agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
    var linha = [
      id,
      agora,
      String((d && (d.codigo_barras || d.codigo)) || '').trim(),
      String((d && (d.tipo_doc || d.escolha)) || 'NOTA').trim() || 'NOTA',
      numero,
      cliente,
      String((d && d.paciente) || '').trim() || 'N/D',
      String((d && d.tipo_devolucao) || '').trim(),
      String((d && d.observacao) || '').trim(),
      String((d && d.status) || 'AGUARDANDO CONFIRMAÇÃO DA MENTOR!').trim(),
      String((d && d.usuario) || '').trim()
    ];
    aba.appendRow(linha);
    try { aba.getRange(aba.getLastRow(), 2).setNumberFormat('dd/MM/yyyy'); } catch (e2) {}
    return { success: true, mensagem: 'Protocolo salvo', id: id, data_protocolo: agora };
  } finally {
    lock.releaseLock();
  }
}

function editarProtocolo(d) {
  var id = String((d && d.id) || '').trim();
  if (!id) return { success: false, mensagem: 'ID é obrigatório para editar' };
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var aba = getAba();
    var last = aba.getLastRow();
    if (last < 2) return { success: false, mensagem: 'Registro não encontrado' };
    var vals = aba.getRange(2, 1, last - 1, HEADER.length).getValues();
    for (var i = 0; i < vals.length; i++) {
      if (String(vals[i][0]) === id) {
        var row = i + 2;
        var atual = vals[i];
        // mantém data_protocolo e id; atualiza o resto se enviado
        var novo = [
          id,
          atual[1],
          d.codigo_barras !== undefined ? String(d.codigo_barras).trim() : atual[2],
          d.tipo_doc !== undefined ? String(d.tipo_doc).trim() : (d.escolha !== undefined ? String(d.escolha).trim() : atual[3]),
          d.numero_doc !== undefined ? String(d.numero_doc).trim() : (d.numero !== undefined ? String(d.numero).trim() : atual[4]),
          d.cliente_hospital !== undefined ? String(d.cliente_hospital).trim() : atual[5],
          d.paciente !== undefined ? String(d.paciente).trim() : atual[6],
          d.tipo_devolucao !== undefined ? String(d.tipo_devolucao).trim() : atual[7],
          d.observacao !== undefined ? String(d.observacao).trim() : atual[8],
          d.status !== undefined ? String(d.status).trim() : atual[9],
          d.usuario !== undefined ? String(d.usuario).trim() : atual[10]
        ];
        aba.getRange(row, 1, 1, HEADER.length).setValues([novo]);
        return { success: true, mensagem: 'Protocolo atualizado' };
      }
    }
    return { success: false, mensagem: 'Registro não encontrado: ' + id };
  } finally {
    lock.releaseLock();
  }
}

function excluirProtocolo(d) {
  var id = String((d && d.id) || '').trim();
  if (!id) return { success: false, mensagem: 'ID é obrigatório para excluir' };
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var aba = getAba();
    var last = aba.getLastRow();
    var vals = aba.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < vals.length; i++) {
      if (String(vals[i][0]) === id) {
        aba.deleteRow(i + 2);
        return { success: true, mensagem: 'Protocolo excluído' };
      }
    }
    return { success: false, mensagem: 'Registro não encontrado: ' + id };
  } finally {
    lock.releaseLock();
  }
}

// ---- Mapa completo da aba "Colado" para o app (lookup instantâneo local) ----
// Retorna [[numero, cliente_hospital, paciente], ...]. O app carrega 1x e
// consulta local; se não achar, usa o 'buscar' como fallback (sempre atual).
function mapaColado() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var aba = ss.getSheetByName('Colado');
  if (!aba) return { success: false, mensagem: 'Aba "Colado" não encontrada na planilha' };
  var last = aba.getLastRow();
  if (last < 1) return { success: true, total: 0, mapa: [] };
  var vals = aba.getRange(1, 1, last, 3).getValues();
  var inicio = 0;
  if (vals.length && !/\d/.test(String(vals[0][0] == null ? '' : vals[0][0]))) inicio = 1; // pula cabeçalho
  var mapa = [];
  for (var i = inicio; i < vals.length; i++) {
    var r = vals[i];
    var num = numeroDeCelulaGas(r[0]);
    if (!num) continue;
    mapa.push([num, String(r[1] == null ? '' : r[1]).trim(), String(r[2] == null ? '' : r[2]).trim()]);
  }
  return { success: true, total: mapa.length, mapa: mapa };
}

// ---- Busca Cliente/Hospital (col B) e Paciente (col C) na aba "Colado" ----
// Procura a linha cujo número do documento bate com o informado, comparando
// de forma flexível: aceita número puro, com zeros à esquerda, chave de
// acesso de 44 dígitos ou URL de QR (?p=...), em qualquer coluna da linha.
function numeroDeCelulaGas(v) {
  var d = String(v == null ? '' : v).replace(/\D/g, '');
  if (!d) return '';
  if (d.length === 44) {
    var n = parseInt(d.slice(25, 34), 10);
    return n ? String(n) : '';
  }
  var m44 = String(v == null ? '' : v).replace(/\s/g, '').match(/(\d{44})/);
  if (m44) return numeroDeCelulaGas(m44[1]);
  return d.replace(/^0+/, '');
}

function buscarColado(d) {
  var numero = numeroDeCelulaGas(d && (d.numero_doc || d.numero || d.nota));
  if (!numero) return { success: false, mensagem: 'Informe o número do documento' };
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var aba = ss.getSheetByName('Colado');
  if (!aba) return { success: false, mensagem: 'Aba "Colado" não encontrada na planilha' };
  var last = aba.getLastRow();
  if (last < 1) return { success: false, mensagem: 'Aba "Colado" vazia' };
  // 1) Caminho rápido: procura exata na coluna A (resolve no servidor, sem trazer a planilha toda).
  //    Cobre o caso comum (número puro na col A). O resto cai na varredura flexível abaixo.
  try {
    var achou = aba.getRange(1, 1, last, 1).createTextFinder(numero).matchEntireCell(true).findNext();
    if (achou) {
      var lin = achou.getRow();
      var bc = aba.getRange(lin, 2, 1, 2).getValues()[0];
      return {
        success: true,
        numero_doc: numero,
        cliente_hospital: String(bc[0] == null ? '' : bc[0]).trim(),
        paciente: String(bc[1] == null ? '' : bc[1]).trim(),
        linha: lin
      };
    }
  } catch (e1) {}
  // 2) Varredura flexível: aceita zeros à esquerda, chave de 44 dígitos ou URL de QR,
  //    em qualquer coluna da linha. Lê só A:C para ser mais rápido.
  var vals = aba.getRange(1, 1, last, 3).getValues();
  var inicio = 0;
  if (vals.length && !/\d/.test(String(vals[0][0] == null ? '' : vals[0][0]))) inicio = 1; // pula cabeçalho
  var total = 0;
  for (var i = inicio; i < vals.length; i++) {
    var r = vals[i];
    if (!r[0] && !r[1] && !r[2]) continue;
    total++;
    var achou = false;
    for (var c = 0; c < r.length; c++) {
      if (numeroDeCelulaGas(r[c]) === numero) { achou = true; break; }
    }
    if (achou) {
      return {
        success: true,
        numero_doc: numero,
        cliente_hospital: String(r[1] == null ? '' : r[1]).trim(),
        paciente: String(r[2] == null ? '' : r[2]).trim(),
        linha: i + 1
      };
    }
  }
  return { success: false, mensagem: 'Doc. ' + numero + ' não encontrado na aba "Colado" (' + total + ' linha(s) verificadas)' };
}
