let majorData = [];
let mathData = [];
let hierarchyData = [];
let aliasData = [];

async function loadCSV(file) {
    const response = await fetch(file);
    if (!response.ok) {
        throw new Error(`${file} 로딩 실패`);
    }
    const text = await response.text();

    return new Promise((resolve) => {
        Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                resolve(results.data);
            }
        });
    });
}

function splitAliases(text) {
    return String(text || "")
        .split(";")
        .map(x => x.trim())
        .filter(Boolean)
        .sort((a, b) => b.length - a.length);
}

function showResult(html) {
    document.getElementById("result").innerHTML = html;
}

function clearResult() {
    document.getElementById("result").innerHTML = "";
}

function findMajor(query) {
    for (const row of aliasData) {
        const aliases = splitAliases(row["별칭"]);
        for (const a of aliases) {
            if (query.includes(a)) {
                return {
                    major: row["대표전공"],
                    keywords: splitAliases(row["검색어"])
                };
            }
        }
    }
    return null;
}

function searchMajor() {
    const query = document.getElementById("majorInput").value.trim();

    if (!query) {
        showResult("<p>검색어를 입력하세요.</p>");
        return;
    }

    const found = findMajor(query);

    if (!found) {
        showResult("<p>관련 전공 정보를 찾을 수 없습니다.</p>");
        return;
    }

    const results = majorData.filter(row => {
        const target = `${row["모집단위1"] || ""} ${row["모집단위2"] || ""}`;
        return found.keywords.some(k => target.includes(k));
    });

    if (results.length === 0) {
        showResult("<p>검색 결과가 없습니다.</p>");
        return;
    }

    let html = `<h2>🎓 '${query}' 관련 전공 검색 결과</h2>`;
    html += `<p>인식된 전공 분야: <strong>${found.major}</strong></p>`;
    html += `<table><thead><tr>
        <th>지역</th><th>대학명</th><th>모집단위1</th><th>모집단위2</th><th>핵심과목</th><th>권장과목</th><th>비고</th>
    </tr></thead><tbody>`;

    for (const row of results) {
        html += `<tr>
            <td>${row["지역"] || ""}</td>
            <td>${row["대학명"] || ""}</td>
            <td>${row["모집단위1"] || ""}</td>
            <td>${row["모집단위2"] || ""}</td>
            <td>${row["핵심과목"] || ""}</td>
            <td>${row["권장과목"] || ""}</td>
            <td>${row["비고"] || ""}</td>
        </tr>`;
    }

    html += "</tbody></table>";
    showResult(html);
}

function findSubject(query) {
    for (const row of mathData) {
        const aliases = splitAliases(row["별칭"]);

        if (String(row["과목명"] || "").includes(query) || query.includes(row["과목명"])) {
            return row;
        }

        for (const a of aliases) {
            if (query.includes(a)) return row;
        }
    }
    return null;
}

function findHierarchy(query) {
    for (const row of hierarchyData) {
        const aliases = splitAliases(row["별칭"]);

        if (String(row["과목명"] || "").includes(query) || query.includes(row["과목명"])) {
            return row;
        }

        for (const a of aliases) {
            if (query.includes(a)) return row;
        }
    }
    return null;
}

function searchSubject() {
    const query = document.getElementById("subjectInput").value.trim();

    if (!query) {
        showResult("<p>검색어를 입력하세요.</p>");
        return;
    }

    const subject = findSubject(query);

    if (!subject) {
        showResult("<p>관련 수학 과목 정보를 찾을 수 없습니다.</p>");
        return;
    }

    const hierarchy = findHierarchy(query);

    let html = `<h2>📘 ${subject["과목명"]}</h2>`;
    html += `<div class="card">`;

    const fields = ["구분", "이수학점", "성적처리", "수능관련", "설명", "추천전공", "관련직업", "관련학과", "주의"];

    for (const f of fields) {
        if (subject[f]) {
            html += `<p><strong>${f}:</strong> ${subject[f]}</p>`;
        }
    }

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

        document.getElementById("majorTab").addEventListener("click", () => {
            document.getElementById("majorTab").classList.add("active");
            document.getElementById("subjectTab").classList.remove("active");
            document.getElementById("majorSection").style.display = "block";
            document.getElementById("subjectSection").style.display = "none";
            clearResult();
        });

        document.getElementById("subjectTab").addEventListener("click", () => {
            document.getElementById("subjectTab").classList.add("active");
            document.getElementById("majorTab").classList.remove("active");
            document.getElementById("subjectSection").style.display = "block";
            document.getElementById("majorSection").style.display = "none";
            clearResult();
        });

        document.getElementById("majorSearchBtn").addEventListener("click", searchMajor);
        document.getElementById("subjectSearchBtn").addEventListener("click", searchSubject);

        document.getElementById("majorResetBtn").addEventListener("click", () => {
            document.getElementById("majorInput").value = "";
            clearResult();
        });

        document.getElementById("subjectResetBtn").addEventListener("click", () => {
            document.getElementById("subjectInput").value = "";
            clearResult();
        });

        document.getElementById("majorInput").addEventListener("keydown", (e) => {
            if (e.key === "Enter") searchMajor();
        });

        document.getElementById("subjectInput").addEventListener("keydown", (e) => {
            if (e.key === "Enter") searchSubject();
        });

    } catch (error) {
        showResult(`<h3>CSV 파일을 불러오지 못했습니다. 파일명과 위치를 확인하세요.</h3><pre>${error.message}</pre>`);
    }
}

init();