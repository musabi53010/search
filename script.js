let majorData = [], mathData = [], hierarchyData = [], aliasData = [];

// 1. 강조 및 통계 패턴 (비고란까지 완벽 대응)
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
    
    // 별칭에 없더라도 입력한 검색어 그대로 찾아보기 (예: 건축)
    const keywords = found ? found.keywords : [query];
    const results = majorData.filter(row => {
        const target = `${row["모집단위1"] || ""} ${row["모집단위2"] || ""} ${row["대학명"] || ""}`;
        return keywords.some(k => target.includes(k));
    });

    if (results.length === 0) { showResult("<p style='text-align:center;'>검색 결과가 없습니다.</p>"); return; }

    let mathCount = {};
    MATH_PATTERNS.forEach(p => mathCount[p.name] = 0);
    results.forEach(row => {
        const combined = (row["핵심과목"] || "") + " " + (row["권장과목"] || "") + " " + (row["비고"] || "");
        MATH_PATTERNS.forEach(p => { if (p.regex.test(combined)) { mathCount[p.name]++; } p.regex.lastIndex = 0; });
    });
    const sortedMath = Object.entries(mathCount).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]);

    let html = `<h2>🎓 '${query}' 검색 결과</h2>`;
    html += `<div class="summary-box"><h4>📊 수학 교과 언급 요약 (비고 포함)</h4><div class="summary-tags">
             ${sortedMath.map(([name, count]) => `<span>${name}: <strong>${count}회</strong></span>`).join("")}</div></div>`;
    html += `<table><thead><tr><th>지역</th><th>대학명</th><th>모집단위1</th><th>모집단위2</th><th>핵심과목</th><th>권장과목</th><th>비고</th></tr></thead><tbody>`;
    results.forEach(row => {
        html += `<tr><td>${row["지역"]||""}</td><td>${row["대학명"]||""}</td><td>${row["모집단위1"]||""}</td><td>${row["모집단위2"]||""}</td>
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

        // 탭 기능
        document.getElementById("majorTab").onclick = () => { 
            document.getElementById("majorTab").classList.add("active"); document.getElementById("subjectTab").classList.remove("active");
            document.getElementById("majorSection").style.display = "block"; document.getElementById("subjectSection").style.display = "none"; clearResult();
        };
        document.getElementById("subjectTab").onclick = () => { 
            document.getElementById("subjectTab").classList.add("active"); document.getElementById("majorTab").classList.remove("active");
            document.getElementById("subjectSection").style.display = "block"; document.getElementById("majorSection").style.display = "none"; clearResult();
        };

        // 검색 버튼 클릭 이벤트
        document.getElementById("majorSearchBtn").onclick = searchMajor;
        document.getElementById("subjectSearchBtn").onclick = searchSubject;

        // 초기화 버튼 이벤트
        document.getElementById("majorResetBtn").onclick = () => { document.getElementById("majorInput").value = ""; clearResult(); };
        document.getElementById("subjectResetBtn").onclick = () => { document.getElementById("subjectInput").value = ""; clearResult(); };

        // ★★★ 엔터키 이벤트 추가 ★★★
        document.getElementById("majorInput").addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault(); // 기본 동작 방지
                searchMajor();
            }
        });

        document.getElementById("subjectInput").addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                searchSubject();
            }
        });

    } catch (e) { console.error(e); }
}
init();