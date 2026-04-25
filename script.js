let majorData = [], mathData = [], hierarchyData = [], aliasData = [];

// 1. 강조 패턴 (순서: 긴 단어부터 배치하여 짧은 단어가 가로채지 못하게 함)
const MATH_PATTERNS = [
    { name: "미적분Ⅰ", regex: /미적분\s*Ⅰ|미적분\s*I|미적분\s*1|미적\s*1/g },
    { name: "미적분Ⅱ", regex: /미적분\s*Ⅱ|미적분\s*II|미적분\s*2|미적\s*2/g },
    { name: "확률과통계", regex: /확률과\s*통계|확통/g },
    { name: "인공지능수학", regex: /인공지능\s*수학|AI\s*수학/g },
    { name: "수학과제탐구", regex: /수학과제\s*탐구/g },
    { name: "경제수학", regex: /경제\s*수학|경제수학/g }, // '수학'보다 무조건 먼저 검사
    { name: "실용통계", regex: /실용\s*통계/g },
    { name: "직무수학", regex: /직무\s*수학/g },
    { name: "수학과문화", regex: /수학과\s*문화/g },
    { name: "대수", regex: /대수/g },
    { name: "기하", regex: /기하/g },
    { name: "수학(일반)", regex: /수학(?![가-힣])/g } // 단순 '수학'은 가장 마지막에
];

// [버그 해결 핵심] 하이라이트 처리 함수
function highlightMathSubjects(text, colorClass, selectedSubject = null) {
    if (!text) return "";
    
    // 이미 HTML로 변환된 부분은 재매칭되지 않도록 보호하는 새로운 방식입니다.
    let result = text;
    const cleanSelected = selectedSubject ? selectedSubject.replace(/\s+/g, "") : null;

    // 1. 긴 패턴부터 순서대로 찾아서 특수 표식(Placeholder)으로 바꿉니다.
    const matches = [];
    const sortedPatterns = [...MATH_PATTERNS].sort((a, b) => b.name.length - a.name.length);

    sortedPatterns.forEach((item, index) => {
        result = result.replace(item.regex, (match) => {
            const cleanMatch = match.replace(/\s+/g, "");
            const isSelected = (cleanSelected && (cleanMatch === cleanSelected || item.name === selectedSubject));
            
            // 텍스트를 바로 <span>으로 바꾸지 않고, 나중에 바꿀 수 있게 저장해둡니다.
            const placeholder = `__MATCH_${index}_${matches.length}__`;
            
            let finalClass = (item.name === "수학(일반)") ? "math-core" : colorClass;
            const html = `<span class="${finalClass} ${isSelected ? 'selected-math' : ''}">${match}</span>`;
            
            matches.push({ placeholder, html });
            return placeholder;
        });
    });

    // 2. 모든 매칭이 끝난 후 표식들을 실제 HTML로 한꺼번에 교체합니다.
    matches.forEach(m => {
        result = result.replace(m.placeholder, m.html);
    });

    return result;
}

// --- 이하 searchMajor, init 등 기존 로직 동일 (중간 생략 방지를 위해 하단에 계속) ---

function searchMajor(selectedSubject = null) {
    const query = document.getElementById("majorInput").value.trim();
    if (!query) { clearResult(); return; }
    
    let searchKeywords = [query];
    const aliasEntry = aliasData.find(row => {
        if (!row["별칭"]) return false;
        const aliases = row["별칭"].split(";").map(x => x.trim());
        return aliases.some(a => query.includes(a)) || row["대표전공"] === query;
    });
    if (aliasEntry) searchKeywords = (aliasEntry["검색어"] || "").split(";").map(x => x.trim());

    const results = majorData.filter(row => {
        const fullDept = `${row["모집단위1"] || ""} ${row["모집단위2"] || ""}`;
        if (query === "국어교육" && (fullDept.includes("일어") || fullDept.includes("중국어"))) return false;
        return fullDept.includes(query) || searchKeywords.some(k => fullDept.includes(k));
    });

    if (results.length === 0) { showResult("<p style='text-align:center; padding:20px;'>해당 학과를 찾을 수 없습니다.</p>"); return; }

    let mathCount = {};
    MATH_PATTERNS.forEach(p => mathCount[p.name] = 0);
    results.forEach(row => {
        const combined = (row["핵심과목"] || "") + " " + (row["권장과목"] || "") + " " + (row["비고"] || "");
        MATH_PATTERNS.forEach(p => { 
            const found = combined.match(p.regex);
            if (found) mathCount[p.name] += found.length;
        });
    });
    const sortedMath = Object.entries(mathCount).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]);

    let html = `<h2>🎓 '${query}' 검색 결과</h2>`;
    html += `<div class="summary-box"><h4>📊 수학 교과 언급 요약 (과목 클릭 시 강조)</h4><div class="summary-tags">
                ${sortedMath.map(([name, count]) => `
                    <span onclick="filterBySubject('${name}')" class="summary-tag ${selectedSubject === name ? 'active-tag' : ''}">
                        ${name}: <strong>${count}회</strong>
                    </span>`).join("")}</div></div>`;
    
    html += `<div style="overflow-x:auto;"><table><thead><tr><th>지역</th><th>대학명</th><th>모집단위1</th><th>모집단위2</th><th>핵심과목</th><th>권장과목</th><th>비고</th></tr></thead><tbody>`;
    results.forEach(row => {
        html += `<tr><td>${row["지역"]||""}</td><td>${row["대학명"]||""}</td><td>${row["모집단위1"]||""}</td><td>${row["모집단위2"]||""}</td>
                 <td>${highlightMathSubjects(row["핵심과목"], "math-core", selectedSubject)}</td>
                 <td>${highlightMathSubjects(row["권장과목"], "math-recom", selectedSubject)}</td>
                 <td>${highlightMathSubjects(row["비고"], "math-recom", selectedSubject)}</td></tr>`;
    });
    html += "</tbody></table></div>";
    showResult(html);
}

// ... (window.filterBySubject, searchSubject, init 함수는 기존과 동일하게 유지)
window.filterBySubject = function(subjectName) { searchMajor(subjectName); };
function showResult(html) { const r = document.getElementById("result"); r.innerHTML = html; r.classList.add("show-result"); }
function clearResult() { const r = document.getElementById("result"); r.innerHTML = ""; r.classList.remove("show-result"); }

async function init() {
    [majorData, mathData, hierarchyData, aliasData] = await Promise.all([
        loadCSV("major_recommendations.csv"), loadCSV("math_subjects.csv"),
        loadCSV("math_hierarchy.csv"), loadCSV("major_alias.csv")
    ]);
    document.getElementById("majorSearchBtn").onclick = () => searchMajor();
    document.getElementById("majorInput").onkeydown = (e) => { if(e.key==="Enter") searchMajor(); };
    document.getElementById("majorResetBtn").onclick = () => { document.getElementById("majorInput").value=""; clearResult(); };
    // 탭 전환 등 기타 이벤트...
}
init();