// services/ferramentas.js
// Aqui ficam as funções REAIS que o Gemini poderá acionar (Function Calling)

/**
 * Fase 1 - Ferramenta 1: Clima em tempo real (OpenWeatherMap)
 */
async function buscarClimaTempoReal(cidade) {
    try {
        const apiKey = process.env.WEATHER_API_KEY;
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cidade)}&appid=${apiKey}&units=metric&lang=pt_br`;

        const resposta = await fetch(url);
        const dados = await resposta.json();

        if (dados.cod !== 200) {
            return { erro: true, mensagem: `Não encontrei a cidade "${cidade}".` };
        }

        return {
            cidade: dados.name,
            pais: dados.sys?.country,
            temperatura: dados.main.temp,
            sensacaoTermica: dados.main.feels_like,
            descricao: dados.weather[0].description,
            umidade: dados.main.humidity
        };
    } catch (erro) {
        console.error("❌ Erro ao buscar clima:", erro.message);
        return { erro: true, mensagem: "Falha ao consultar a API de clima." };
    }
}

/**
 * Desafio Hacker - Ferramenta 2: Conversor de Moedas (AwesomeAPI - gratuita, sem chave)
 * Ex: USD-BRL, EUR-BRL
 */
async function converterMoeda(moedaOrigem, moedaDestino, valor) {
    try {
        const par = `${moedaOrigem.toUpperCase()}-${moedaDestino.toUpperCase()}`;
        const url = `https://economia.awesomeapi.com.br/json/last/${par}`;

        const resposta = await fetch(url);
        const dados = await resposta.json();

        const chave = `${moedaOrigem.toUpperCase()}${moedaDestino.toUpperCase()}`;
        const cotacaoObj = dados[chave];

        if (!cotacaoObj) {
            return { erro: true, mensagem: `Não consegui converter ${moedaOrigem} para ${moedaDestino}.` };
        }

        const cotacao = parseFloat(cotacaoObj.bid);
        const valorConvertido = valor * cotacao;

        return {
            moedaOrigem: moedaOrigem.toUpperCase(),
            moedaDestino: moedaDestino.toUpperCase(),
            valorOriginal: valor,
            cotacaoAtual: cotacao,
            valorConvertido: Number(valorConvertido.toFixed(2))
        };
    } catch (erro) {
        console.error("❌ Erro ao converter moeda:", erro.message);
        return { erro: true, mensagem: "Falha ao consultar a API de câmbio." };
    }
}

module.exports = { buscarClimaTempoReal, converterMoeda };
