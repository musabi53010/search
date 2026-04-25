let majorData = [];
let mathData = [];
let hierarchyData = [];
let aliasData = [];

// 수학 과목 리스트 (강조 및 카운트용)
const MATH_SUBJECT_LIST = ["대수", "미적분Ⅰ", "미적분Ⅱ", "확률과통계", "기하", "경제수학", "인공지능수학", "수학과제탐구", "실용통계", "직무수학", "수학과문화"];

async function loadCSV(file) {
    const response = await fetch(file);
    if (!response.ok) throw new Error(`${file} 로딩 실패`);
    const text = await response.text();
    return new Promise((resolve) => {
        Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) { resolve(results.data); }
        });
    });
}

// 수학 과목만 찾아 색상을 입히는 함수
function highlightMathSubjects(text, colorClass) {
    if (!text) return "";
    let highlighted = text;
    MATH_SUBJECT_LIST.forEach(subject => {
        const regex = new RegExp(subject, "g");
        highlighted = highlighted.replace(regex, `<span class="${colorClass}">${subject}</span>`);
    });
    return highlighted;
}

function splitAliases(text) {
    return String(text || "").split(";").map(x => x.trim()).filter(Boolean).sort((a, b) => b.length - a.length);
}

function showResult(html) { document.getElementById("result").innerHTML = html; }
function clearResult() { document.getElementById("result").innerHTML = ""; }

function findMajor(query) {
    for (const row of aliasData) {
        const aliases = splitAliases(row["별칭"]);
        for (const a of aliases) {
            if (query.includes(a)) return { major: row["대표전공"], keywords: splitAliases(row["검색어"]) };
        }
    }
    return null;
}

function searchMajor() {
    const query = document.getElementById("majorInput").value.trim();
    if (!query) { showResult("<p>검색어를 입력하세요.</p>"); return; }

    const found = findMajor(query);
    if (!found) { showResult("<p>관련 전공 정보를 찾을 수 없습니다.</p>"); return; }

    const results = majorData.filter(row => {
        const target = `${row["모집단위1"] || ""} ${row["모집단위2"] || ""}`;
        return found.keywords.some(k => target.includes(k));
    });

    if (results.length === 0) { showResult("<p>검색 결과가 없습니다.</p>"); return; }

    // --- 수학 과목 통계 계산 ---
    let mathCount = {};
    MATH_SUBJECT_LIST.forEach(s => mathCount[s] = 0);
    
    results.forEach(row => {
        const combined = (row["핵심과목"] || "") + "," + (row["권장과목"] || "");
        MATH_SUBJECT_LIST.forEach(s => {
            if (combined.includes(s)) mathCount[s]++;
        });
    });

    const sortedMath = Object.entries(mathCount).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]);

    // --- 화면 출력 ---
    let html = `<h2>🎓 '${query}' 관련 전공 검색 결과</h2>`;
    
    // 요약 박스 추가
    html += `<div class="summary-box">
                <h4>📊 수학 교과 언급 횟수 요약</h4>
                <div class="summary-tags">
                    ${sortedMath.map(([name, count]) => `<span>${name}: <strong>${count}회</strong></span>`).join("")}
                </div>
            </div>`;

    html += `<div style="overflow-x:auto;"><table><thead><tr>
        <th>지역</th><th>대학명</th><th>모집단위1</th><th>모집단위2</th><th>핵심과목</th><th>권장과목</th><th>비고</th>
    </tr></thead><tbody>`;

    for (const row of results) {
        html += `<tr>
            <td>${row["지역"] || ""}</td>
            <td>${row["대학명"] || ""}</td>
            <td>${row["모집단위1"] || ""}</td>
            <td>${row["모집단위2"] || ""}</td>
            <td>${highlightMathSubjects(row["핵심과목"], "math-core")}</td>
            <td>${highlightMathSubjects(row["권장과목"], "math-recom")}</td>
            <td>${row["비고"] || ""}</td>
        </tr>`;
    }
    html += "</tbody></table></div>";
    showResult(html);
}

// (searchSubject, findSubject, findHierarchy 함수는 기존과 동일하게 유지)
function findSubject(query) {
    for (const row of mathData) {
        const aliases = splitAliases(row["별칭"]);
        if (String(row["과목명"] || "").includes(query) || query.includes(row["과목명"])) return row;
        for (const a of aliases) { if (query.includes(a)) return row; }
    }
    return null;
}

function findHierarchy(query) {
    for (const row of hierarchyData) {
        const aliases = splitAliases(row["별칭"]);
        if (String(row["과목명"] || "").includes(query) || query.includes(row["과목명"])) return row;
        for (const a of aliases) { if (query.includes(a)) return row; }
    }
    return null;
}

function searchSubject() {
    const query = document.getElementById("subjectInput").value.trim();
    if (!query) { showResult("<p>검색어를 입력하세요.</p>"); return; }
    const subject = findSubject(query);
    if (!subject) { showResult("<p>관련 수학 과목 정보를 찾을 수 없습니다.</p>"); return; }
    const hierarchy = findHierarchy(query);
    let html = `<h2>📘 ${subject["과목명"]}</h2><div class="card">`;
    const fields = ["구분", "이수학점", "성적처리", "수능관련", "설명", "추천전공", "관련직업", "관련학과", "주의"];
    for (const f of fields) { if (subject[f]) { html += `<p><strong>${f}:</strong> ${subject[f]}</p>`; } }
    html += `</div>`;
    if (hierarchy) {
        html += `<div class="card"><h3>📊 이수 흐름</h3>`;
        if (hierarchy["선수과목"]) html += `<p><strong>선수과목:</strong> ${hierarchy["선수과목"]}</p>`;
        if (hierarchy["후속과목"]) html += `<p><strong>후속과목:</strong> ${hierarchy["후속과목"]}</p>`;
        if (hierarchy["유형"]) html += `<p><strong>유형:</strong> ${hierarchy["유형"]}</p>`;
        if (hierarchy["설명"]) html += `<p><strong>설명:</strong> ${hierarchy["설명"]}</p>`;
        html += `</div>`;
    }
    showResult(html);
}

async function init() {
    try {
        majorData = await loadCSV("major_recommendations.csv");
        mathData = await loadCSV("math_subjects.csv");
        hierarchyData = await loadCSV("math_hierarchy.csv");
        aliasData = await loadCSV("major_alias.csv");

        document.getElementById("majorTab").onclick = () => {
            document.getElementById("majorTab").classList.add("active");
            document.getElementById("subjectTab").classList.remove("active");
            document.getElementById("majorSection").style.display = "block";
            document.getElementById("subjectSection").style.display = "none";
            clearResult();
        };

        document.getElementById("subjectTab").onclick = () => {
            document.getElementById("subjectTab").classList.add("active");
            document.getElementById("majorTab").classList.remove("active");
            document.getElementById("subjectSection").style.display = "block";
            document.getElementById("majorSection").style.display = "none";
            clearResult();
        };

        document.getElementById("majorSearchBtn").onclick = searchMajor;
        document.getElementById("subjectSearchBtn").onclick = searchSubject;
        document.getElementById("majorResetBtn").onclick = () => { document.getElementById("majorInput").value = ""; clearResult(); };
        document.getElementById("subjectResetBtn").onclick = () => { document.getElementById("subjectInput").value = ""; clearResult(); };
        document.getElementById("majorInput").onkeydown = (e) => { if (e.key === "Enter") searchMajor(); };
        document.getElementById("subjectInput").onkeydown = (e) => { if (e.key === "Enter") searchSubject(); };
    } catch (error) {
        showResult(`<h3>데이터 로딩 실패</h3><p>${error.message}</p>`);
    }
}

init();