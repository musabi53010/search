let majorData = [], mathData = [], hierarchyData = [], aliasData = [];

// 1. 강조 및 통계 패턴
const MATH_PATTERNS = [
    { name: "대수", regex: /대수/g },
    { name: "미적분Ⅰ", regex: /미적분\s*Ⅰ|미적분\s*I|미적분\s*1|미적\s*1/g },
    { name: "미적분Ⅱ", regex: /미적분\s*Ⅱ|미적분\s*II|미적분\s*2|미적\s*2/g },
    { name: "확률과통계", regex: /확률과\s*통계|확통/g },
    { name: "기하", regex: /기하/g },
    { name: "경제수학", regex: /경제\s*수학/g },
    { name: "인공지능수학", regex: /인공지능\s*수학|AI\s*수학/g },
    { name: "수학과제탐구", regex: /수학과제\s*탐구/g }
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
    MATH_PATTERNS.forEach(item => {
        highlighted = highlighted.replace(item.regex, (match) => `<span class="${colorClass}">${match}</span>`);
    });
    return highlighted;
}

function findMajorInfo(query) {
    for (const row of aliasData) {
        const aliases = (row["별칭"] || "").split(";").map(x => x.trim());
        if (aliases.some(a => query.includes(a)) || (row["대표전공"] && query.includes(row["대표전공"]))) {
            return { 
                major: row["대표전공"], 
                keywords: (row["검색어"] || "").split(";").map(x => x.trim()) 
            };
        }
    }
    return null;
}

function searchMajor() {
    const query = document.getElementById("majorInput").value.trim();
    const resultDiv = document.getElementById("result");
    if (!query) { resultDiv.innerHTML = ""; return; }
    
    const found = findMajorInfo(query);
    const searchKeywords = found ? found.keywords : [query];

    // 필터링 강화: 모집단위2(학과명)에 키워드가 포함된 경우만 추출
    const results = majorData.filter(row => {
        const deptName = (row["모집단위2"] || "").trim();
        return searchKeywords.some(k => deptName.includes(k));
    });

    if (results.length === 0) {
        resultDiv.innerHTML = "<p style='text-align:center; padding:20px;'>해당 학과명을 찾을 수 없습니다.</p>";
        return;
    }

    // 통계 및 결과 생성
    let html = `<h2>🎓 '${query}' 검색 결과</h2>`;
    // (중간 생략: 기존 테이블 생성 로직과 동일하게 구성하시면 됩니다)
    
    let tableHtml = `<table><thead><tr><th>지역</th><th>대학명</th><th>학과명</th><th>핵심과목</th><th>권장과목</th><th>비고</th></tr></thead><tbody>`;
    results.forEach(row => {
        tableHtml += `<tr><td>${row["지역"]}</td><td>${row["대학명"]}</td><td>${row["모집단위2"]}</td>
                     <td>${highlightMathSubjects(row["핵심과목"], "math-core")}</td>
                     <td>${highlightMathSubjects(row["권장과목"], "math-recom")}</td>
                     <td>${highlightMathSubjects(row["비고"], "math-recom")}</td></tr>`;
    });
    tableHtml += "</tbody></table>";
    resultDiv.innerHTML = html + tableHtml;
    resultDiv.classList.add("show-result");
}

// 나머지 searchSubject 및 init 함수는 기존과 동일하게 유지
async function init() {
    try {
        [majorData, mathData, hierarchyData, aliasData] = await Promise.all([
            loadCSV("major_recommendations.csv"), loadCSV("math_subjects.csv"),
            loadCSV("math_hierarchy.csv"), loadCSV("major_alias.csv")
        ]);
        document.getElementById("majorSearchBtn").onclick = searchMajor;
        // (이벤트 바인딩 코드...)
    } catch (e) { console.error("데이터 로드 실패:", e); }
}
init();