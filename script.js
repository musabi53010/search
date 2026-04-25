let majorData = [], mathData = [], hierarchyData = [], aliasData = [];

const MATH_PATTERNS = [
    { name: "미적분Ⅰ", regex: /미적분\s*Ⅰ|미적분\s*I|미적분\s*1|미적\s*1/g },
    { name: "미적분Ⅱ", regex: /미적분\s*Ⅱ|미적분\s*II|미적분\s*2|미적\s*2/g },
    { name: "확률과통계", regex: /확률과\s*통계|확통/g },
    { name: "인공지능수학", regex: /인공지능\s*수학|AI\s*수학/g },
    { name: "수학과제탐구", regex: /수학과제\s*탐구/g },
    { name: "경제수학", regex: /경제\s*수학|경제수학/g },
    { name: "실용통계", regex: /실용\s*통계/g },
    { name: "직무수학", regex: /직무\s*수학/g },
    { name: "수학과문화", regex: /수학과\s*문화/g },
    { name: "대수", regex: /대수/g },
    { name: "기하", regex: /기하/g },
    { name: "수학(일반)", regex: /수학(?![가-힣])/g } 
];

async function loadCSV(file) {
    const response = await fetch(file);
    const text = await response.text();
    return new Promise((resolve) => {
        Papa.parse(text, { header: true, skipEmptyLines: true, complete: (r) => resolve(r.data) });
    });
}

function highlightMathSubjects(text, colorClass, selectedSubject = null) {
    if (!text) return "";
    let highlighted = text;
    const sortedPatterns = [...MATH_PATTERNS].sort((a, b) => b.name.length - a.name.length);

    sortedPatterns.forEach(item => {
        highlighted = highlighted.replace(item.regex, (match) => {
            const isSelected = (selectedSubject && item.name === selectedSubject);
            return `<span class="${colorClass} ${isSelected ? 'selected-math' : ''}">${match}</span>`;
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

// 전역 함수로 등록
window.filterBySubject = function(subjectName) {
    searchMajor(subjectName); 
};

function searchMajor(selectedSubject = null) {
    const query = document.getElementById("majorInput").value.trim();
    if (!query) { clearResult(); return; }
    
    // 별칭/키워드 매칭 로직 개선
    let searchKeywords = [query];
    const aliasEntry = aliasData.find(row => {
        if (!row["별칭"]) return false;
        const aliases = row["별칭"].split(";").map(x => x.trim());
        return aliases.some(a => query === a) || row["대표전공"] === query;
    });
    
    if (aliasEntry) {
        searchKeywords = (aliasEntry["검색어"] || "").split(";").map(x => x.trim());
    }

    // 필터링 로직: 서울대 등 모든 대학이 나오도록 범위를 넓힘
    const results = majorData.filter(row => {
        const fullDept = `${row["모집단위1"] || ""} ${row["모집단위2"] || ""}`;
        
        // 1. 입력한 검색어가 학과명에 포함되는가? (예: '국어교육'이 '국어교육과'에 포함됨)
        const matchesQuery = fullDept.includes(query);
        
        // 2. 별칭 키워드 중 하나라도 포함되는가?
        const matchesKeyword = searchKeywords.some(k => fullDept.includes(k));

        // 국어교육 검색 시 일어/중국어 등 다른 과가 섞이는 것을 방지하기 위한 필터
        if (query === "국어교육" && (fullDept.includes("일어") || fullDept.includes("중국어"))) {
            return false;
        }

        return matchesQuery || matchesKeyword;
    });

    if (results.length === 0) {
        showResult("<p style='text-align:center; padding:20px;'>해당 학과를 찾을 수 없습니다.</p>");
        return;
    }

    // 통계 계산
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
    
    // 요약표
    html += `<div class="summary-box">
                <h4>📊 수학 교과 언급 요약 (과목 클릭 시 하단 표에서 강조)</h4>
                <div class="summary-tags">
                    ${sortedMath.map(([name, count]) => `
                        <span onclick="filterBySubject('${name}')" 
                              style="cursor:pointer; ${selectedSubject === name ? 'background:#2563eb; color:white; border-color:#1e40af;' : 'background:white;'}">
                            ${name}: <strong>${count}회</strong>
                        </span>`).join("")}
                </div>
            </div>`;
    
    // 결과 테이블
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

// 나머지 초기화 로직 (동일)
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
        document.getElementById("majorInput").onkeydown = (e) => { if (e.key === "Enter") searchMajor(); };
        // 기타 버튼 생략...
    } catch (e) { console.error(e); }
}
init();