// 1. Настройка случайного фона
function setRandomGradient() {
    const colors = [
        ['#667eea', '#764ba2'], ['#ff9a9e', '#fecfef'],
        ['#00f2fe', '#4facfe'], ['#88d3ce', '#6e45e2'], ['#ff0844', '#ffb199']
    ];
    const randomPair = colors[Math.floor(Math.random() * colors.length)];
    document.body.style.setProperty('--color1', randomPair[0]);
    document.body.style.setProperty('--color2', randomPair[1]);
}

// 2. Функция отрисовки графика
function drawPlot() {
    const input = document.getElementById('functionInput');
    const container = document.getElementById('plotContainer');
    if (!input || !container) return;

    const expression = input.value || "x^2";

    try {
        const xValues = math.range(-10, 10, 0.1).toArray();
        const yValues = xValues.map(x => math.evaluate(expression, { x: x }));

        const data = [{
            x: xValues, y: yValues,
            type: 'scatter', mode: 'lines',
            line: { color: '#00f2fe', width: 3 }
        }];

        const layout = {
            autosize: true,
            margin: { t: 30, b: 40, l: 50, r: 30 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#fff' },
            xaxis: { gridcolor: 'rgba(255,255,255,0.1)', zerolinecolor: '#999' },
            yaxis: { gridcolor: 'rgba(255,255,255,0.1)', zerolinecolor: '#999' }
        };

        Plotly.newPlot(container, data, layout, { responsive: true, displaylogo: false });
    } catch (error) {
        console.warn("Ошибка в формуле");
    }
}

// --- AI-чат (Прямая работа с API без библиотек) ---
const HF_TOKEN = "ВАШ_ТОКЕН"; 

function parseAIResponse(text) {
    try {
        // Убираем возможный мусор, который ИИ пишет до или после JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error();
        return JSON.parse(jsonMatch[0]);
    } catch (e) {
        return { formula: "sin(x) * 2", explanation: "Я подобрал для вас красивую волну!" };
    }
}

async function askHuggingFace(userPrompt) {
    // Используем CORS Anywhere как посредника
    const proxy = "https://cors-anywhere.herokuapp.com/";
    const apiUrl = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";
    
    // Собираем полный путь
    const url = proxy + apiUrl;
    
    const prompt = `<s>[INST] Ты — математический помощник. На запрос: "${userPrompt}" ответь СТРОГО в формате JSON: {"formula": "код для math.js", "explanation": "текст"}. Используй переменную x. [/INST]`;

    const response = await fetch(url, {
        headers: { 
            "Authorization": `Bearer ${HF_TOKEN}`,
            "Content-Type": "application/json",
            "x-requested-with": "XMLHttpRequest" // Нужно для прокси
        },
        method: "POST",
        body: JSON.stringify({ 
            inputs: prompt,
            parameters: { max_new_tokens: 200, wait_for_model: true } 
        }),
    });

    if (!response.ok) {
        // Если прокси просит активацию
        if (response.status === 403) {
            throw new Error("Нужно активировать прокси. Нажми кнопку в чате.");
        }
        const errData = await response.json();
        throw new Error(errData.error || "Ошибка API");
    }

    const result = await response.json();
    const generatedText = result[0].generated_text;
    const aiResponse = generatedText.split('[/INST]')[1] || generatedText;
    
    return parseAIResponse(aiResponse);
}

async function processAiQuery() {
    const inputField = document.getElementById('aiInput');
    const chatHistory = document.getElementById('chatHistory');
    const userText = inputField.value.trim();
    
    if (!userText) return;

    chatHistory.innerHTML += `<div class="chat-msg user-msg"><span>Вы:</span> ${userText}</div>`;
    inputField.value = "ИИ думает...";
    inputField.disabled = true;

    try {
        const aiResult = await askHuggingFace(userText);
        document.getElementById('functionInput').value = aiResult.formula;
        drawPlot();

        chatHistory.innerHTML += `
            <div class="chat-msg bot-msg">
                <div class="bot-label">Ассистент MMG</div>
                ${aiResult.explanation}
                <div class="formula-badge">${aiResult.formula}</div>
            </div>`;
    } catch (error) {
        console.error(error);
        chatHistory.innerHTML += `<div class="chat-msg bot-msg error">Ошибка: модель просыпается. Попробуйте через 15 сек.</div>`;
    }

    inputField.value = "";
    inputField.disabled = false;
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// --- Инициализация ---
window.addEventListener('load', () => {
    setRandomGradient();
    drawPlot();
    
    // Привязка событий
    document.getElementById('plotButton').addEventListener('click', drawPlot);
    document.getElementById('aiSubmit').addEventListener('click', processAiQuery);
    document.getElementById('aiInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') processAiQuery();
    });
});