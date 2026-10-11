var SPREADSHEET_ID = 'COLE_AQUI_O_ID_DA_PLANILHA';

function doGet(e) {
  var action = e.parameter.action;
  var data = e.parameter;
  var result;

  try {
    switch (action) {
      // --- MATERIAIS ---
      case 'buscarMaterial':
        result = buscarMaterial(data);
        break;
      case 'listarMateriais':
        result = listarMateriais();
        break;
      case 'salvarMaterial':
        result = salvarMaterial(data);
        break;
      case 'atualizarCadastroMaterial':
        result = atualizarCadastroMaterial(data);
        break;
      case 'excluirCadastroMaterial':
        result = excluirCadastroMaterial(data);
        break;

      // --- CADASTROS GENERICOS (Hospital, Convenio, Medico, etc) ---
      case 'salvarCadastro':
        result = salvarCadastro(data);
        break;
      case 'listarCadastros':
        result = listarCadastros(data.tipo);
        break;
      case 'atualizarCadastro':
        result = atualizarCadastro(data);
        break;
      case 'excluirCadastro':
        result = excluirCadastro(data);
        break;

      // --- PEDIDOS ---
      case 'salvarPedido':
        result = salvarPedido(data);
        break;
      case 'listarPedidos':
        result = listarPedidos();
        break;

      default:
        result = { success: false, mensagem: 'Acao nao reconhecida: ' + action };
    }
  } catch (err) {
    result = { success: false, mensagem: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  return doGet(e);
}

// --- MATERIAIS ---

function buscarMaterial(data) {
  var sheet = getSheet('Materiais');
  if (!sheet) return { success: false, mensagem: 'Aba Materiais nao encontrada' };
  var codigo = data.codigo;
  var ultimaLinha = sheet.getLastRow();
  if (ultimaLinha < 2) return { success: false, mensagem: 'Material nao encontrado' };
  var valores = sheet.getRange(2, 1, ultimaLinha - 1, 5).getValues();
  for (var i = 0; i < valores.length; i++) {
    if (String(valores[i][0]) === String(codigo)) {
      return {
        success: true,
        material: {
          codigo: valores[i][0],
          descricao: valores[i][1],
          referencia: valores[i][2],
          anvisa: valores[i][3],
          dataCadastro: valores[i][4]
        }
      };
    }
  }
  return { success: false, mensagem: 'Material nao encontrado' };
}

function listarMateriais() {
  var sheet = getSheet('Materiais');
  if (!sheet) return { success: true, dados: [] };
  var ultimaLinha = sheet.getLastRow();
  if (ultimaLinha < 2) return { success: true, dados: [] };
  var valores = sheet.getRange(2, 1, ultimaLinha - 1, 5).getValues();
  var dados = [];
  for (var i = 0; i < valores.length; i++) {
    dados.push({
      codigo: valores[i][0],
      descricao: valores[i][1],
      referencia: valores[i][2],
      anvisa: valores[i][3],
      dataCadastro: valores[i][4]
    });
  }
  return { success: true, dados: dados };
}

function salvarMaterial(data) {
  var sheet = getSheet('Materiais');
  if (!sheet) return { success: false, mensagem: 'Aba Materiais nao encontrada' };
  var codigo = data.codigo;
  var descricao = data.descricao;
  var referencia = data.referencia || '';
  var anvisa = data.anvisa || '';
  var ultimaLinha = sheet.getLastRow();
  if (ultimaLinha >= 2) {
    var valores = sheet.getRange(2, 1, ultimaLinha - 1, 1).getValues();
    for (var i = 0; i < valores.length; i++) {
      if (String(valores[i][0]) === String(codigo)) {
        return { success: false, mensagem: 'Codigo ja cadastrado' };
      }
    }
  }
  var dataAtual = new Date().toLocaleDateString('pt-BR');
  sheet.appendRow([codigo, descricao, referencia, anvisa, dataAtual]);
  return { success: true, mensagem: 'Material cadastrado com sucesso' };
}

function atualizarCadastroMaterial(data) {
  var sheet = getSheet('Materiais');
  if (!sheet) return { success: false, mensagem: 'Aba Materiais nao encontrada' };
  var codigoOriginal = data.codigoOriginal;
  var codigo = data.codigo;
  var descricao = data.descricao;
  var referencia = data.referencia || '';
  var anvisa = data.anvisa || '';
  var ultimaLinha = sheet.getLastRow();
  if (ultimaLinha < 2) return { success: false, mensagem: 'Material nao encontrado' };
  var valores = sheet.getRange(2, 1, ultimaLinha - 1, 1).getValues();
  for (var i = 0; i < valores.length; i++) {
    if (String(valores[i][0]) === String(codigoOriginal)) {
      var linha = i + 2;
      sheet.getRange(linha, 1).setValue(codigo);
      sheet.getRange(linha, 2).setValue(descricao);
      sheet.getRange(linha, 3).setValue(referencia);
      sheet.getRange(linha, 4).setValue(anvisa);
      return { success: true, mensagem: 'Material atualizado com sucesso' };
    }
  }
  return { success: false, mensagem: 'Material nao encontrado' };
}

function excluirCadastroMaterial(data) {
  var sheet = getSheet('Materiais');
  if (!sheet) return { success: false, mensagem: 'Aba Materiais nao encontrada' };
  var codigo = data.codigo;
  var ultimaLinha = sheet.getLastRow();
  if (ultimaLinha < 2) return { success: false, mensagem: 'Material nao encontrado' };
  var valores = sheet.getRange(2, 1, ultimaLinha - 1, 1).getValues();
  for (var i = 0; i < valores.length; i++) {
    if (String(valores[i][0]) === String(codigo)) {
      sheet.deleteRow(i + 2);
      return { success: true, mensagem: 'Material excluido com sucesso' };
    }
  }
  return { success: false, mensagem: 'Material nao encontrado' };
}

// --- CADASTROS GENERICOS ---

function salvarCadastro(data) {
  var tipo = data.tipo;
  var nome = data.nome;
  var nomeAba = tipo + 's';
  var sheet = getSheet(nomeAba);
  if (!sheet) {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    sheet = ss.insertSheet(nomeAba);
    sheet.appendRow(['Nome', 'Data Cadastro']);
  }
  var ultimaLinha = sheet.getLastRow();
  if (ultimaLinha >= 2) {
    var valores = sheet.getRange(2, 1, ultimaLinha - 1, 1).getValues();
    for (var i = 0; i < valores.length; i++) {
      if (String(valores[i][0]).toLowerCase() === String(nome).toLowerCase()) {
        return { success: false, mensagem: tipo + ' ja cadastrado' };
      }
    }
  }
  var dataAtual = new Date().toLocaleDateString('pt-BR');
  sheet.appendRow([nome, dataAtual]);
  return { success: true, mensagem: tipo + ' cadastrado com sucesso' };
}

function listarCadastros(tipo) {
  var nomeAba = tipo + 's';
  var sheet;
  try {
    sheet = getSheet(nomeAba);
  } catch (e) {
    return { success: true, dados: [] };
  }
  if (!sheet) return { success: true, dados: [] };
  var ultimaLinha = sheet.getLastRow();
  if (ultimaLinha < 2) return { success: true, dados: [] };
  var valores = sheet.getRange(2, 1, ultimaLinha - 1, 2).getValues();
  var dados = [];
  for (var i = 0; i < valores.length; i++) {
    dados.push({
      nome: valores[i][0],
      dataCadastro: valores[i][1]
    });
  }
  return { success: true, dados: dados };
}

function atualizarCadastro(data) {
  var tipo = data.tipo;
  var nomeOriginal = data.nomeOriginal;
  var nome = data.nome;
  var nomeAba = tipo + 's';
  var sheet = getSheet(nomeAba);
  if (!sheet) return { success: false, mensagem: tipo + ' nao encontrado' };
  var ultimaLinha = sheet.getLastRow();
  if (ultimaLinha < 2) return { success: false, mensagem: tipo + ' nao encontrado' };
  var valores = sheet.getRange(2, 1, ultimaLinha - 1, 1).getValues();
  for (var i = 0; i < valores.length; i++) {
    if (String(valores[i][0]).toLowerCase() === String(nomeOriginal).toLowerCase()) {
      var linha = i + 2;
      sheet.getRange(linha, 1).setValue(nome);
      return { success: true, mensagem: tipo + ' atualizado com sucesso' };
    }
  }
  return { success: false, mensagem: tipo + ' nao encontrado' };
}

function excluirCadastro(data) {
  var tipo = data.tipo;
  var nome = data.nome;
  var nomeAba = tipo + 's';
  var sheet = getSheet(nomeAba);
  if (!sheet) return { success: false, mensagem: tipo + ' nao encontrado' };
  var ultimaLinha = sheet.getLastRow();
  if (ultimaLinha < 2) return { success: false, mensagem: tipo + ' nao encontrado' };
  var valores = sheet.getRange(2, 1, ultimaLinha - 1, 1).getValues();
  for (var i = 0; i < valores.length; i++) {
    if (String(valores[i][0]).toLowerCase() === String(nome).toLowerCase()) {
      sheet.deleteRow(i + 2);
      return { success: true, mensagem: tipo + ' excluido com sucesso' };
    }
  }
  return { success: false, mensagem: tipo + ' nao encontrado' };
}

// --- PEDIDOS ---

function salvarPedido(data) {
  var sheetPedidos = getSheet('Pedidos');
  var sheetItens = getSheet('Itens_Pedido');
  if (!sheetPedidos || !sheetItens) return { success: false, mensagem: 'Abas nao encontradas' };

  var numero = data.numeroPedido;
  var hospital = data.hospital || '';
  var medico = data.medico || '';
  var convenio = data.convenio || '';
  var paciente = data.paciente || '';
  var dataCirurgia = data.dataCirurgia || '';
  var responsavel = data.responsavel || '';
  var dataAtual = new Date().toLocaleDateString('pt-BR');

  var itens;
  try {
    itens = typeof data.itens === 'string' ? JSON.parse(data.itens) : data.itens;
  } catch (e) {
    itens = [];
  }

  sheetPedidos.appendRow([numero, hospital, medico, convenio, paciente, dataCirurgia, responsavel, dataAtual, 'Aberto']);

  for (var i = 0; i < itens.length; i++) {
    var item = itens[i];
    sheetItens.appendRow([
      numero,
      item.codigo || '',
      item.descricao || '',
      item.qtd || 0,
      item.lote || '',
      item.validade || '',
      item.anvisa || ''
    ]);
  }

  return { success: true, mensagem: 'Pedido salvo com sucesso' };
}

function listarPedidos() {
  var sheet = getSheet('Pedidos');
  if (!sheet) return { success: true, dados: [] };
  var ultimaLinha = sheet.getLastRow();
  if (ultimaLinha < 2) return { success: true, dados: [] };
  var valores = sheet.getRange(2, 1, ultimaLinha - 1, 9).getValues();
  var dados = [];
  for (var i = 0; i < valores.length; i++) {
    dados.push({
      numero: valores[i][0],
      hospital: valores[i][1],
      medico: valores[i][2],
      convenio: valores[i][3],
      paciente: valores[i][4],
      dataCirurgia: valores[i][5],
      responsavel: valores[i][6],
      dataCadastro: valores[i][7],
      status: valores[i][8]
    });
  }
  return { success: true, dados: dados };
}

// --- UTILS ---

function getSheet(name) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    criarAbasSeNecessario();
    sheet = ss.getSheetByName(name);
  }
  return sheet;
}

function criarAbasSeNecessario() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var abasNecessarias = ['Materiais', 'Pedidos', 'Itens_Pedido'];
  for (var i = 0; i < abasNecessarias.length; i++) {
    if (!ss.getSheetByName(abasNecessarias[i])) {
      var nova = ss.insertSheet(abasNecessarias[i]);
      if (abasNecessarias[i] === 'Materiais') {
        nova.appendRow(['Codigo', 'Descricao', 'Referencia', 'ANVISA', 'Data Cadastro']);
      } else if (abasNecessarias[i] === 'Pedidos') {
        nova.appendRow(['Numero', 'Hospital', 'Medico', 'Convenio', 'Paciente', 'Data Cirurgia', 'Responsavel', 'Data Cadastro', 'Status']);
      } else if (abasNecessarias[i] === 'Itens_Pedido') {
        nova.appendRow(['Numero Pedido', 'Codigo', 'Descricao', 'Quantidade', 'Lote', 'Validade', 'ANVISA']);
      }
    }
  }
}
