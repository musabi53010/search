let majorData = [], mathData = [], hierarchyData = [], aliasData = [];

// 1. 강조 패턴 (순서가 매우 중요합니다: 긴 단어부터 매칭)
const MATH_PATTERNS = [
    { name: "미적분Ⅰ", regex: /미적분\s*Ⅰ|미적분\s*I|미적분\s*1|미적\s*1/g },
    { name: "미적분Ⅱ", regex: /미적분\s*Ⅱ|미적분\s*II|미적분\s*2|미적\s*2/g },
    { name: "확률과통계", regex: /확률과\s*통계|확통/g },
    { name: "인공지능수학", regex: /인공지능\s*수학|AI\s*수학/g },
    { name: "수학과제탐구", regex: /수학과제\s*탐구/g },
    { name: "경제수학", regex: /경제\s*수학|경제수학/g }, // 경제수학을 '수학'보다 먼저 배치
    { name: "실용통계", regex: /실용\s*통계/g },
    { name: "직무수학", regex: /직무\s*수학/g },
    { name: "수학과문화", regex: /수학과\s*문화/g },
    { name: "대수", regex: /대수/g },
    { name: "기하", regex: /기하/g },
    { name: "수학(일반)", regex: /수학(?![가-힣])/g } // 단순 '수학'은 가장 마지막에 검사
];

async function loadCSV(file) {
    const response = await fetch(file);
    const text = await response.text();
    return new Promise((resolve) => {
        Papa.parse(text, { header: true, skipEmptyLines: true, complete: (r) => resolve(r.data) });
    });
}

// 하이라이트 함수: 선택된 과목 강조 로직 강화
function highlightMathSubjects(text, colorClass, selectedSubject = null) {
    if (!text) return "";
    let highlighted = text;
    
    // 패턴 이름을 길이순으로 정렬 (긴 단어가 우선권을 가짐)
    const sortedPatterns = [...MATH_PATTERNS].sort((a, b) => b.name.length - a.name.length);

    sortedPatterns.forEach(item => {
        highlighted = highlighted.replace(item.regex, (match) => {
            // 비교 시 공백을 제거하여 '경제 수학'과 '경제수학'을 동일하게 취급
            const cleanMatch = match.replace(/\s+/g, "");
            const cleanSelected = selectedSubject ? selectedSubject.replace(/\s+/g, "") : null;
            const cleanItemName = item.name.replace(/\s+/g, "");
            
            const isSelected = (cleanSelected && (cleanMatch === cleanSelected || cleanItemName === cleanSelected));
            
            // 강조 클래스 결정: '경제수학'처럼 특정 패턴에 걸리면 해당 클래스 부여
            let finalClass = colorClass;
            if (item.name === "수학(일반)") finalClass = "math-core"; // 일반 수학은 핵심과목 색상 권장

            return `<span class="${finalClass} ${isSelected ? 'selected-math' : ''}">${match}</span>`;
        });
    });
    return highlighted;
}

function showResult(html) {
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = html;
    if (html.trim() !== "") resultDiv.classList.add("show-result");
    else resultDiv.classList.remove("show-result");
}

function clearResult() {
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = "";
    resultDiv.classList.remove("show-result");
}

window.filterBySubject = function(subjectName) {
    searchMajor(subjectName); 
};

function searchMajor(selectedSubject = null) {
    const query = document.getElementById("majorInput").value.trim();
    if (!query) { clearResult(); return; }
    
    let searchKeywords = [query];
    const aliasEntry = aliasData.find(row => {
        if (!row["별칭"]) return false;
        const aliases = row["별칭"].split(";").map(x => x.trim());
        return aliases.some(a => query.includes(a)) || row["대표전공"] === query;
    });
    
    if (aliasEntry) {
        searchKeywords = (aliasEntry["검색어"] || "").split(";").map(x => x.trim());
    }

    const results = majorData.filter(row => {
        const d1 = (row["모집단위1"] || "").trim();
        const d2 = (row["모집단위2"] || "").trim();
        const fullDept = d1 + " " + d2;
        
        const matchesQuery = fullDept.includes(query);
        const matchesKeyword = searchKeywords.some(k => fullDept.includes(k));

        if (query === "국어교육" && (fullDept.includes("일어") || fullDept.includes("중국어"))) return false;
        return matchesQuery || matchesKeyword;
    });

    if (results.length === 0) {
        showResult("<p style='text-align:center; padding:20px;'>해당 학과를 찾을 수 없습니다.</p>");
        return;
    }

    let mathCount = {};
    MATH_PATTERNS.forEach(p => mathCount[p.name] = 0);
    results.forEach(row => {
        const combined = (row["핵심과목"] || "") + " " + (row["권장과목"] || "") + " " + (row["비고"] || "");
        MATH_PATTERNS.forEach(p => { 
            const matches = combined.match(p.regex);
            if (matches) mathCount[p.name] += matches.length;
        });
    });
    const sortedMath = Object.entries(mathCount).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]);

    let html = `<h2>🎓 '${query}' 검색 결과</h2>`;
    
    html += `<div class="summary-box">
                <h4>📊 수학 교과 언급 요약 (과목 클릭 시 하단 표에서 강조)</h4>
                <div class="summary-tags">
                    ${sortedMath.map(([name, count]) => {
                        const isThisSelected = (selectedSubject === name);
                        return `<span onclick="filterBySubject('${name}')" class="summary-tag ${isThisSelected ? 'active-tag' : ''}">
                                    ${name}: <strong>${count}회</strong>
                                </span>`;
                    }).join("")}
                </div>
            </div>`;
    
    html += `<div style="overflow-x:auto;"><table><thead><tr><th>지역</th><th>대학명</th><th>모집단위1</th><th>모집단위2</th><th>핵심과목</th><th>권장과목</th><th>비고</th></tr></thead><tbody>`;
    results.forEach(row => {
        html += `<tr>
            <td>${row["지역"]||""}</td><td>${row["대학명"]||""}</td><td>${row["모집단위1"]||""}</td><td>${row["모집단위2"]||""}</td>
            <td>${highlightMathSubjects(row["핵심과목"], "math-core", selectedSubject)}</td>
            <td>${highlightMathSubjects(row["권장과목"], "math-recom", selectedSubject)}</td>
            <td>${highlightMathSubjects(row["비고"], "math-recom", selectedSubject)}</td>
        </tr>`;
    });
    html += "</tbody></table></div>";
    showResult(html);
}

// searchSubject, init 함수 유지
function searchSubject() {
    const query = document.getElementById("subjectInput").value.trim();
    if (!query) { clearResult(); return; }
    const sub = mathData.find(r => (r["과목명"]||"").includes(query) || (r["별칭"]||"").includes(query));
    if (!sub) { showResult("<p style='text-align:center; padding:20px;'>과목 정보를 찾을 수 없습니다.</p>"); return; }
    const h = hierarchyData.find(r => r["과목명"] === sub["과목명"]);
    let html = `<h2>📘 ${sub["과목명"]}</h2><div class="card">`;
    ["구분", "이수학점", "성적처리", "수능관련", "설명", "추천전공", "관련학과"].forEach(f => { if(sub[f]) html += `<p><strong>${f}:</strong> ${sub[f]}</p>`; });
    html += `</div>`;
    if (h) {
        html += `<div class="card"><h3>📊 이수 흐름</h3>`;
        if (h["선수과목"]) html += `<p><strong>선수과목:</strong> ${h["선수과목"]}</p>`;
        if (h["후속과목"]) html += `<p><strong>후속과목:</strong> ${h["후속과목"]}</p>`;
        html += `</div>`;
    }
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
        document.getElementById("majorSearchBtn").onclick = () => searchMajor();
        document.getElementById("subjectSearchBtn").onclick = searchSubject;
        document.getElementById("majorResetBtn").onclick = () => { document.getElementById("majorInput").value = ""; clearResult(); };
        document.getElementById("subjectResetBtn").onclick = () => { document.getElementById("subjectInput").value = ""; clearResult(); };
        document.getElementById("majorInput").onkeydown = (e) => { if (e.key === "Enter") searchMajor(); };
        document.getElementById("subjectInput").onkeydown = (e) => { if (e.key === "Enter") searchSubject(); };
    } catch (e) { console.error(e); }
}
init();