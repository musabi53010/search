var majorData = [], mathData = [], hierarchyData = [], aliasData = [];

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

window.loadCSV = async function(file) {
    try {
        const response = await fetch(file);
        const text = await response.text();
        return new Promise((resolve) => {
            Papa.parse(text, { header: true, skipEmptyLines: true, complete: (r) => resolve(r.data) });
        });
    } catch (e) { console.error(file + " 로드 실패:", e); return []; }
};

function highlightMathSubjects(text, colorClass, selectedSubject = null) {
    if (!text) return "";
    const matches = [];
    const cleanSelected = selectedSubject ? selectedSubject.replace(/\s+/g, "") : null;
    MATH_PATTERNS.forEach(item => {
        const regex = new RegExp(item.regex.source, "g");
        let match;
        while ((match = regex.exec(text)) !== null) {
            matches.push({ start: match.index, end: match.index + match[0].length, text: match[0], item: item });
        }
    });
    matches.sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start);
    const selectedMatches = [];
    matches.forEach(m => {
        const overlaps = selectedMatches.some(s => !(m.end <= s.start || m.start >= s.end));
        if (!overlaps) selectedMatches.push(m);
    });
    selectedMatches.sort((a, b) => a.start - b.start);
    let result = "", lastIndex = 0;
    selectedMatches.forEach(m => {
        result += text.slice(lastIndex, m.start);
        const cleanMatch = m.text.replace(/\s+/g, ""), cleanItemName = m.item.name.replace(/\s+/g, "");
        const isSelected = cleanSelected && (cleanMatch === cleanSelected || cleanItemName === cleanSelected);
        const finalClass = m.item.name === "수학(일반)" ? "math-core" : colorClass;
        result += `<span class="${finalClass} ${isSelected ? 'selected-math' : ''}">${m.text}</span>`;
        lastIndex = m.end;
    });
    result += text.slice(lastIndex);
    return result;
}

window.showResult = function(html) {
    const r = document.getElementById("result");
    if (r) { r.innerHTML = html; r.classList.add("show-result"); }
};

window.searchMajor = function(selectedSubject = null) {
    const input = document.getElementById("majorInput");
    const query = input ? input.value.trim() : "";
    if (!query) return;
    let searchKeywords = [query];
    const aliasEntry = aliasData.find(row => {
        const aliases = (row["별칭"] || "").split(";").map(x => x.trim());
        return aliases.some(a => query.includes(a)) || row["대표전공"] === query;
    });
    if (aliasEntry) searchKeywords = (aliasEntry["검색어"] || "").split(";").map(x => x.trim());
    const results = majorData.filter(row => {
        const fullDept = `${row["모집단위1"] || ""} ${row["모집단위2"] || ""}`;
        if (query === "국어교육" && (fullDept.includes("일어") || fullDept.includes("중국어"))) return false;
        return fullDept.includes(query) || searchKeywords.some(k => fullDept.includes(k));
    });
    if (results.length === 0) { window.showResult("<p style='text-align:center; padding:20px;'>학과를 찾을 수 없습니다.</p>"); return; }
    let mathCount = {};
    MATH_PATTERNS.forEach(p => mathCount[p.name] = 0);
    results.forEach(row => {
        const combined = (row["핵심과목"] || "") + " " + (row["권장과목"] || "") + " " + (row["비고"] || "");
        MATH_PATTERNS.forEach(p => { 
            const regex = new RegExp(p.regex.source, "g");
            const found = combined.match(regex);
            if (found) mathCount[p.name] += found.length;
        });
    });
    const sortedMath = Object.entries(mathCount).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]);
    let html = `<h2>🎓 '${query}' 결과</h2><div class="summary-box"><h4>📊 수학 교과 요약 (클릭 시 강조)</h4><div class="summary-tags">
                ${sortedMath.map(([name, count]) => `<span onclick="window.searchMajor('${name}')" class="summary-tag ${selectedSubject === name ? 'active-tag' : ''}">${name}: <strong>${count}회</strong></span>`).join("")}</div></div>`;
    html += `<div style="overflow-x:auto;"><table><thead><tr><th>지역</th><th>대학명</th><th>모집단위1</th><th>모집단위2</th><th>핵심과목</th><th>권장과목</th><th>비고</th></tr></thead><tbody>`;
    results.forEach(row => {
        html += `<tr><td>${row["지역"]||""}</td><td>${row["대학명"]||""}</td><td>${row["모집단위1"]||""}</td><td>${row["모집단위2"]||""}</td><td>${highlightMathSubjects(row["핵심과목"], "math-core", selectedSubject)}</td><td>${highlightMathSubjects(row["권장과목"], "math-recom", selectedSubject)}</td><td>${highlightMathSubjects(row["비고"], "math-recom", selectedSubject)}</td></tr>`;
    });
    html += "</tbody></table></div>";
    window.showResult(html);
};

// [수학 과목 검색 로직 강화]
window.searchSubject = function() {
    const input = document.getElementById("subjectInput");
    const query = input ? input.value.trim().replace(/\s+/g, "") : ""; // 검색어 공백 제거
    if (!query) return;
    
    // 데이터 내 과목명에서도 공백을 제거하고 비교하여 검색 확률을 높입니다.
    const sub = mathData.find(r => {
        const cleanName = (r["과목명"] || "").replace(/\s+/g, "");
        const cleanAlias = (r["별칭"] || "").replace(/\s+/g, "");
        return cleanName.includes(query) || cleanAlias.includes(query);
    });
    
    if (!sub) {
        window.showResult("<p style='text-align:center; padding:20px;'>'"+query+"' 과목 정보를 찾을 수 없습니다.</p>");
        return;
    }
    
    const h = hierarchyData.find(r => r["과목명"].replace(/\s+/g, "") === sub["과목명"].replace(/\s+/g, ""));
    let html = `<h2>📘 ${sub["과목명"]}</h2><div class="card">`;
    ["구분", "이수학점", "성적처리", "수능관련", "설명", "추천전공", "관련학과"].forEach(f => {
        if(sub[f]) html += `<p><strong>${f}:</strong> ${sub[f]}</p>`;
    });
    html += `</div>`;
    
    if (h) {
        html += `<div class="card"><h3>📊 이수 흐름</h3><p><strong>선수과목:</strong> ${h["선수과목"]||"없음"}</p><p><strong>후속과목:</strong> ${h["후속과목"]||"없음"}</p></div>`;
    }
    window.showResult(html);
};

document.addEventListener("DOMContentLoaded", async () => {
    try {
        [majorData, mathData, hierarchyData, aliasData] = await Promise.all([
            window.loadCSV("major_recommendations.csv"), window.loadCSV("math_subjects.csv"),
            window.loadCSV("math_hierarchy.csv"), window.loadCSV("major_alias.csv")
        ]);
        document.getElementById("majorSearchBtn").onclick = () => window.searchMajor();
        document.getElementById("subjectSearchBtn").onclick = () => window.searchSubject();
        document.getElementById("majorResetBtn").onclick = () => { document.getElementById("majorInput").value=""; document.getElementById("result").innerHTML=""; };
        document.getElementById("subjectResetBtn").onclick = () => { document.getElementById("subjectInput").value=""; document.getElementById("result").innerHTML=""; };
        document.getElementById("majorInput").onkeydown = (e) => { if(e.key==="Enter") window.searchMajor(); };
        document.getElementById("subjectInput").onkeydown = (e) => { if(e.key==="Enter") window.searchSubject(); };
        document.getElementById("majorTab").onclick = function() {
            this.classList.add("active"); document.getElementById("subjectTab").classList.remove("active");
            document.getElementById("majorSection").style.display = "block"; document.getElementById("subjectSection").style.display = "none";
        };
        document.getElementById("subjectTab").onclick = function() {
            this.classList.add("active"); document.getElementById("majorTab").classList.remove("active");
            document.getElementById("subjectSection").style.display = "block"; document.getElementById("majorSection").style.display = "none";
        };
    } catch (e) { console.error("초기화 실패:", e); }
});