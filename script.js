let majorData = [], mathData = [], hierarchyData = [], aliasData = [];

const MATH_PATTERNS = [
    { name: "대수", regex: /대수/g },
    { name: "미적분Ⅰ", regex: /미적분\s*Ⅰ|미적분\s*I|미적분\s*1|미적\s*1/g },
    { name: "미적분Ⅱ", regex: /미적분\s*Ⅱ|미적분\s*II|미적분\s*2|미적\s*2/g },
    { name: "확률과통계", regex: /확률과\s*통계|확통/g },
    { name: "기하", regex: /기하/g },
    { name: "경제수학", regex: /경제\s*수학/g },
    { name: "인공지능수학", regex: /인공지능\s*수학|AI\s*수학/g },
    { name: "수학과제탐구", regex: /수학과제\s*탐구/g },
    { name: "실용통계", regex: /실용\s*통계/g },
    { name: "직무수학", regex: /직무\s*수학/g },
    { name: "수학과문화", regex: /수학과\s*문화/g },
    { name: "수학(일반)", regex: /수학(?![가-힣])/g } 
];

async function loadCSV(file) {
    const response = await fetch(file);
    const text = await response.text();
    return new Promise((resolve) => {
        Papa.parse(text, { header: true, skipEmptyLines: true, complete: (r) => resolve(r.data) });
    });
}

function highlightMathSubjects(text, colorClass) {
    if (!text) return "";
    let highlighted = text;
    const sortedPatterns = [...MATH_PATTERNS].sort((a, b) => b.name.length - a.name.length);
    sortedPatterns.forEach(item => {
        highlighted = highlighted.replace(item.regex, (match) => `<span class="${colorClass}">${match}</span>`);
    });
    return highlighted;
}

function showResult(html) {
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = html;
    if (html.trim() !== "") {
        resultDiv.classList.add("show-result");
    } else {
        resultDiv.classList.remove("show-result");
    }
}

function clearResult() {
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = "";
    resultDiv.classList.remove("show-result");
}

function findMajor(query) {
    for (const row of aliasData) {
        const aliases = (row["별칭"] || "").split(";").map(x => x.trim());
        for (const a of aliases) {
            if (query.includes(a)) return { major: row["대표전공"], keywords: (row["검색어"] || "").split(";").map(x => x.trim()) };
        }
    }
    return null;
}

function searchMajor() {
    const query = document.getElementById("majorInput").value.trim();
    if (!query) { showResult(""); return; }
    const found = findMajor(query);
    const keywords = found ? found.keywords : [query];

    // --- 정교화된 필터링 로직 ---
    // 1. 학과명(모집단위)에 키워드가 포함된 경우 (최우선)
    let primaryResults = majorData.filter(row => {
        const dept = `${row["모집단위1"] || ""} ${row["모집단위2"] || ""}`;
        return keywords.some(k => dept.includes(k));
    });

    // 2. 학과명에는 없지만 대학명이나 비고란에 키워드가 포함된 경우 (보조)
    // 단, 검색어가 너무 짧을 때(예: '우주') 비고란까지 뒤지면 노이즈가 심하므로 
    // 학과명 검색 결과가 없을 때만 보여주거나 별도로 합칩니다.
    let secondaryResults = [];
    if (primaryResults.length < 5) { // 학과명 검색 결과가 적을 때만 비고란 검색 수행
        secondaryResults = majorData.filter(row => {
            const dept = `${row["모집단위1"] || ""} ${row["모집단위2"] || ""}`;
            const extra = `${row["대학명"] || ""} ${row["비고"] || ""}`;
            const isDeptMatch = keywords.some(k => dept.includes(k));
            const isExtraMatch = keywords.some(k => extra.includes(k));
            return !isDeptMatch && isExtraMatch;
        });
    }

    const results = [...primaryResults, ...secondaryResults];

    if (results.length === 0) { showResult("<p style='text-align:center;'>검색 결과가 없습니다.</p>"); return; }

    // 통계 계산
    let mathCount = {};
    MATH_PATTERNS.forEach(p => mathCount[p.name] = 0);
    results.forEach(row => {
        const combined = (row["핵심과목"] || "") + " " + (row["권장과목"] || "") + " " + (row["비고"] || "");
        MATH_PATTERNS.forEach(p => { if (p.regex.test(combined)) { mathCount[p.name]++; } p.regex.lastIndex = 0; });
    });
    const sortedMath = Object.entries(mathCount).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]);

    let html = `<h2>🎓 '${query}' 검색 결과</h2>`;
    html += `<div class="summary-box"><h4>📊 수학 교과 언급 요약</h4><div class="summary-tags">
             ${sortedMath.map(([name, count]) => `<span>${name}: <strong>${count}회</strong></span>`).join("")}</div></div>`;
    html += `<table><thead><tr><th>지역</th><th>대학명</th><th>모집단위1</th><th>모집단위2</th><th>핵심과목</th><th>권장과목</th><th>비고</th></tr></thead><tbody>`;
    
    results.forEach((row, index) => {
        // 보조 결과(비고란 검색)는 약간 흐리게 표시하거나 구분할 수 있습니다 (선택사항)
        const isSecondary = index >= primaryResults.length;
        html += `<tr style="${isSecondary ? 'opacity: 0.8; background: #fafafa;' : ''}">
                 <td>${row["지역"]||""}</td><td>${row["대학명"]||""}</td><td>${row["모집단위1"]||""}</td><td>${row["모집단위2"]||""}</td>
                 <td>${highlightMathSubjects(row["핵심과목"], "math-core")}</td><td>${highlightMathSubjects(row["권장과목"], "math-recom")}</td>
                 <td>${highlightMathSubjects(row["비고"], "math-recom")}</td></tr>`;
    });
    html += "</tbody></table>";
    showResult(html);
}

function searchSubject() {
    const query = document.getElementById("subjectInput").value.trim();
    if (!query) { showResult(""); return; }
    const sub = mathData.find(r => (r["과목명"]||"").includes(query) || (r["별칭"]||"").includes(query));
    if (!sub) { showResult("<p style='text-align:center;'>과목 정보를 찾을 수 없습니다.</p>"); return; }
    let html = `<h2>📘 ${sub["과목명"]}</h2><div class="card">`;
    ["구분", "이수학점", "성적처리", "수능관련", "설명", "추천전공", "관련직업", "관련학과", "주의"].forEach(f => { if(sub[f]) html += `<p><strong>${f}:</strong> ${sub[f]}</p>`; });
    html += `</div>`;
    showResult(html);
}

async function init() {
    try {
        [majorData, mathData, hierarchyData, aliasData] = await Promise.all([
            loadCSV("major_recommendations.csv"), loadCSV("math_subjects.csv"),
            loadCSV("math_hierarchy.csv"), loadCSV("major_alias.csv")
        ]);

        document.getElementById("majorTab").onclick = () => { 
            document.getElementById("majorTab").classList.add("active"); document.getElementById("subjectTab").classList.remove("active");
            document.getElementById("majorSection").style.display = "block"; document.getElementById("subjectSection").style.display = "none"; clearResult();
        };
        document.getElementById("subjectTab").onclick = () => { 
            document.getElementById("subjectTab").classList.add("active"); document.getElementById("majorTab").classList.remove("active");
            document.getElementById("subjectSection").style.display = "block"; document.getElementById("majorSection").style.display = "none"; clearResult();
        };

        document.getElementById("majorSearchBtn").onclick = searchMajor;
        document.getElementById("subjectSearchBtn").onclick = searchSubject;
        document.getElementById("majorResetBtn").onclick = () => { document.getElementById("majorInput").value = ""; clearResult(); };
        document.getElementById("subjectResetBtn").onclick = () => { document.getElementById("subjectInput").value = ""; clearResult(); };

        document.getElementById("majorInput").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); searchMajor(); } });
        document.getElementById("subjectInput").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); searchSubject(); } });

    } catch (e) { console.error(e); }
}
init();