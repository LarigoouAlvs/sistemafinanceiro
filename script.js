import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, setDoc, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyBqlAO_ZyNmsdA1ouhK6ckaxWqkROIyu7c",
  authDomain: "financeirodaobra-7aacc.firebaseapp.com",
  projectId: "financeirodaobra-7aacc",
  storageBucket: "financeirodaobra-7aacc.appspot.com",
  messagingSenderId: "1003037768066",
  appId: "1:1003037768066:web:d791f19792e79b6109b79b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const lancamentoBtn = document.getElementById('adicionar-lancamento');
const cartaoBtn = document.getElementById('adicionar-cartao');
const formaPagamento = document.getElementById('forma');
const selectCartao = document.getElementById('cartao-nome');
let grafico;

formaPagamento.addEventListener('change', atualizarCartoes);

cartaoBtn.addEventListener('click', async () => {
  const nome = document.getElementById('cartao-novo-nome').value.trim();
  const saldo = parseFloat(document.getElementById('cartao-saldo').value);
  const tipo = document.getElementById('cartao-tipo').value;

  if (!nome || isNaN(saldo)) return alert("Preencha os dados do cartão corretamente.");

  await setDoc(doc(db, 'cartoes', nome), {
    nome,
    saldo,
    faturaAtual: 0,
    tipo
  });

  alert('Cartão cadastrado!');
  await atualizarCartoes();
});

lancamentoBtn.addEventListener('click', async () => {
  const nome = document.getElementById('nome').value.trim();
  const valor = parseFloat(document.getElementById('valor').value);
  const tipo = document.getElementById('tipo').value;
  const forma = document.getElementById('forma').value;
  const parcelas = parseInt(document.getElementById('parcelas').value);
  const cartaoNome = selectCartao.value;

  if (!nome || isNaN(valor) || !cartaoNome || parcelas < 1) {
    return alert("Preencha todos os dados corretamente.");
  }

  for (let i = 0; i < parcelas; i++) {
    const vencimento = new Date();
    vencimento.setMonth(vencimento.getMonth() + i);
    await addDoc(collection(db, 'lancamentos'), {
      nome,
      valor: valor / parcelas,
      tipo,
      forma,
      parcelas,
      cartaoNome,
      vencimento: vencimento.toISOString().split('T')[0]
    });
  }

  if (forma === 'credito') {
    const ref = doc(db, 'cartoes', cartaoNome);
    const cartoes = await getDocs(collection(db, 'cartoes'));
    for (const docSnap of cartoes.docs) {
      if (docSnap.id === cartaoNome) {
        const atual = docSnap.data().faturaAtual || 0;
        await updateDoc(ref, { faturaAtual: atual + valor });
      }
    }
  }

  alert('Lançamento registrado!');
  await atualizarResumo();
});

async function atualizarCartoes() {
  const forma = formaPagamento.value;
  const snap = await getDocs(collection(db, 'cartoes'));
  const lista = document.getElementById('lista-cartoes');
  selectCartao.innerHTML = '';

  lista.innerHTML = '';
  snap.forEach(doc => {
    const c = doc.data();
    const tipo = c.tipo;

    const isCompatível =
      tipo === 'ambos' ||
      (tipo === 'credito' && forma === 'credito') ||
      (tipo === 'debito' && forma === 'debito');

    if (isCompatível) {
      const opt = document.createElement('option');
      opt.value = c.nome;
      opt.textContent = c.nome;
      selectCartao.appendChild(opt);
    }

    lista.innerHTML += `<li><strong>${c.nome}</strong> (${c.tipo})<br>
      Saldo: R$ ${c.saldo.toFixed(2)} | Fatura: R$ ${c.faturaAtual?.toFixed(2) || 0}</li>`;
  });
}

async function atualizarResumo() {
  const snap = await getDocs(collection(db, 'lancamentos'));
  const mesAtual = new Date().toISOString().slice(0, 7);
  let totalReceitas = 0, totalDespesas = 0;

  snap.forEach(doc => {
    const d = doc.data();
    if (d.vencimento?.startsWith(mesAtual)) {
      if (d.tipo === 'receita') totalReceitas += d.valor;
      else totalDespesas += d.valor;
    }
  });

  const saldo = totalReceitas - totalDespesas;
  document.getElementById('resumo').innerHTML = `
    <p>Receitas: R$ ${totalReceitas.toFixed(2)}</p>
    <p>Despesas: R$ ${totalDespesas.toFixed(2)}</p>
    <p>Saldo: R$ ${saldo.toFixed(2)}</p>
  `;
  desenharGrafico(totalReceitas, totalDespesas);
}

function desenharGrafico(receitas, despesas) {
  const ctx = document.getElementById('graficoResumo').getContext('2d');
  if (grafico) grafico.destroy();
  grafico = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Receitas', 'Despesas'],
      datasets: [{
        data: [receitas, despesas],
        backgroundColor: ['#4CAF50', '#F44336']
      }]
    }
  });
}

// Inicialização
document.getElementById('data-alvo').addEventListener('change', atualizarResumo);
atualizarCartoes();
atualizarResumo();
