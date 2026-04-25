// 1. 데이터를 담을 변수들을 전역으로 선언
var majorData = [], mathData = [], hierarchyData = [], aliasData = [];

// 2. 강조 패턴
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

// 3. CSV 로드 함수
window.loadCSV = async function(file) {
    const response = await fetch(file);

    if (!response.ok) {
        throw new Error(file + " 파일을 찾을 수 없습니다.");
    }

    const text = await response.text();

    return new Promise((resolve) => {
        Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: (r) => resolve(r.data)
        });
    });
};

// 4. 하이라이트 함수
// 핵심: HTML을 먼저 만들지 않고, 원문에서 매칭 위치를 먼저 계산한 뒤 마지막에 span 생성
function highlightMathSubjects(text, colorClass, selectedSubject = null) {
    if (!text) return "";

    const matches = [];

    MATH_PATTERNS.forEach(item => {
        const regex = new RegExp(item.regex.source, item.regex.flags);
        let match;

        while ((match = regex.exec(text)) !== null) {
            matches.push({
                start: match.index,
                end: match.index + match[0].length,
                text: match[0],
                item: item
            });
        }
    });

    // 실제 매칭 길이가 긴 것 우선
    // 예: "경제 수학"이 "수학"보다 먼저 살아남아야 함
    matches.sort((a, b) => {
        const lengthDiff = (b.end - b.start) - (a.end - a.start);
        return lengthDiff || a.start - b.start;
    });

    // 겹치는 매칭 제거
    const selectedMatches = [];

    matches.forEach(m => {
        const overlaps = selectedMatches.some(s => {
            return !(m.end <= s.start || m.start >= s.end);
        });

        if (!overlaps) {
            selectedMatches.push(m);
        }
    });

    // 원래 문장 순서대로 정렬
    selectedMatches.sort((a, b) => a.start - b.start);

    let result = "";
    let lastIndex = 0;

    selectedMatches.forEach(m => {
        result += text.slice(lastIndex, m.start);

        const cleanMatch = m.text.replace(/\s+/g, "");
        const cleanSelected = selectedSubject ? selectedSubject.replace(/\s+/g, "") : null;
        const cleanItemName = m.item.name.replace(/\s+/g, "");

        const isSelected =
            cleanSelected &&
            (cleanMatch === cleanSelected || cleanItemName === cleanSelected);

        const finalClass =
            m.item.name === "수학(일반)" ? "math-core" : colorClass;

        result += `<span class="${finalClass} ${isSelected ? "selected-math" : ""}">${m.text}</span>`;

        lastIndex = m.end;
    });

    result += text.slice(lastIndex);

    return result;
}

// 5. 결과 표시
function showResult(html) {
    const r = document.getElementById("result");
    if (!r) return;

    r.innerHTML = html;

    if (html.trim() !== "") {
        r.classList.add("show-result");
    } else {
        r.classList.remove("show-result");
    }
}

// 6. 결과 초기화
function clearResult() {
    const r = document.getElementById("result");
    if (!r) return;

    r.innerHTML = "";
    r.classList.remove("show-result");
}

// 7. 전공 검색 함수
window.searchMajor = function(selectedSubject = null) {
    const inputEl = document.getElementById("majorInput");
    const query = inputEl ? inputEl.value.trim() : "";

    if (!query) {
        clearResult();
        return;
    }

    let searchKeywords = [query];

    const aliasEntry = aliasData.find(row => {
        if (!row["별칭"]) return false;

        const aliases = row["별칭"].split(";").map(x => x.trim());

        return aliases.some(a => query.includes(a)) || row["대표전공"] === query;
    });

    if (aliasEntry) {
        const extraKeywords = (aliasEntry["검색어"] || "")
            .split(";")
            .map(x => x.trim())
            .filter(x => x);

        searchKeywords = [...new Set([...searchKeywords, ...extraKeywords])];
    }

    const results = majorData.filter(row => {
        const d1 = (row["모집단위1"] || "").trim();
        const d2 = (row["모집단위2"] || "").trim();
        const fullDept = `${d1} ${d2}`;

        if (
            query === "국어교육" &&
            (fullDept.includes("일어") || fullDept.includes("중국어"))
        ) {
            return false;
        }

        return fullDept.includes(query) || searchKeywords.some(k => fullDept.includes(k));
    });

    if (results.length === 0) {
        showResult("<p style='text-align:center; padding:20px;'>해당 학과를 찾을 수 없습니다.</p>");
        return;
    }

    let mathCount = {};

    MATH_PATTERNS.forEach(p => {
        mathCount[p.name] = 0;
    });

    results.forEach(row => {
        const combined =
            (row["핵심과목"] || "") + " " +
            (row["권장과목"] || "") + " " +
            (row["비고"] || "");

        MATH_PATTERNS.forEach(p => {
            const regex = new RegExp(p.regex.source, p.regex.flags);
            const found = combined.match(regex);

            if (found) {
                mathCount[p.name] += found.length;
            }
        });
    });

    const sortedMath = Object.entries(mathCount)
        .filter(e => e[1] > 0)
        .sort((a, b) => b[1] - a[1]);

    let html = `<h2>🎓 '${query}' 검색 결과</h2>`;

    html += `
        <div class="summary-box">
            <h4>📊 수학 교과 언급 요약 (과목 클릭 시 강조)</h4>
            <div class="summary-tags">
                ${sortedMath.map(([name, count]) => `
                    <span onclick="window.searchMajor('${name}')" class="summary-tag ${selectedSubject === name ? "active-tag" : ""}">
                        ${name}: <strong>${count}회</strong>
                    </span>
                `).join("")}
            </div>
        </div>
    `;

    html += `
        <div style="overflow-x:auto;">
            <table>
                <thead>
                    <tr>
                        <th>지역</th>
                        <th>대학명</th>
                        <th>모집단위1</th>
                        <th>모집단위2</th>
                        <th>핵심과목</th>
                        <th>권장과목</th>
                        <th>비고</th>
                    </tr>
                </thead>
                <tbody>
    `;

    results.forEach(row => {
        html += `
            <tr>
                <td>${row["지역"] || ""}</td>
                <td>${row["대학명"] || ""}</td>
                <td>${row["모집단위1"] || ""}</td>
                <td>${row["모집단위2"] || ""}</td>
                <td>${highlightMathSubjects(row["핵심과목"], "math-core", selectedSubject)}</td>
                <td>${highlightMathSubjects(row["권장과목"], "math-recom", selectedSubject)}</td>
                <td>${highlightMathSubjects(row["비고"], "math-recom", selectedSubject)}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    showResult(html);
};

// 8. 수학 과목 검색 함수
window.searchSubject = function() {
    const inputEl = document.getElementById("subjectInput");
    const query = inputEl ? inputEl.value.trim() : "";

    if (!query) {
        clearResult();
        return;
    }

    const sub = mathData.find(r =>
        (r["과목명"] || "").includes(query) ||
        (r["별칭"] || "").includes(query)
    );

    if (!sub) {
        showResult("<p style='text-align:center; padding:20px;'>과목 정보를 찾을 수 없습니다.</p>");
        return;
    }

    const h = hierarchyData.find(r => r["과목명"] === sub["과목명"]);

    let html = `<h2>📘 ${sub["과목명"]}</h2><div class="card">`;

    ["구분", "이수학점", "성적처리", "수능관련", "설명", "추천전공", "관련학과"].forEach(f => {
        if (sub[f]) {
            html += `<p><strong>${f}:</strong> ${sub[f]}</p>`;
        }
    });

    html += `</div>`;

    if (h) {
        html += `
            <div class="card">
                <h3>📊 이수 흐름</h3>
                <p><strong>선수과목:</strong> ${h["선수과목"] || "없음"}</p>
                <p><strong>후속과목:</strong> ${h["후속과목"] || "없음"}</p>
            </div>
        `;
    }

    showResult(html);
};

// 9. 초기화
document.addEventListener("DOMContentLoaded", async () => {
    try {
        [majorData, mathData, hierarchyData, aliasData] = await Promise.all([
            window.loadCSV("major_recommendations.csv"),
            window.loadCSV("math_subjects.csv"),
            window.loadCSV("math_hierarchy.csv"),
            window.loadCSV("major_alias.csv")
        ]);

        const majorBtn = document.getElementById("majorSearchBtn");
        const subjectBtn = document.getElementById("subjectSearchBtn");
        const majorResetBtn = document.getElementById("majorResetBtn");
        const subjectResetBtn = document.getElementById("subjectResetBtn");
        const majorInput = document.getElementById("majorInput");
        const subjectInput = document.getElementById("subjectInput");

        if (majorBtn) {
            majorBtn.onclick = () => window.searchMajor();
        }

        if (subjectBtn) {
            subjectBtn.onclick = () => window.searchSubject();
        }

        if (majorResetBtn) {
            majorResetBtn.onclick = () => {
                if (majorInput) majorInput.value = "";
                clearResult();
            };
        }

        if (subjectResetBtn) {
            subjectResetBtn.onclick = () => {
                if (subjectInput) subjectInput.value = "";
                clearResult();
            };
        }

        if (majorInput) {
            majorInput.onkeydown = (e) => {
                if (e.key === "Enter") window.searchMajor();
            };
        }

        if (subjectInput) {
            subjectInput.onkeydown = (e) => {
                if (e.key === "Enter") window.searchSubject();
            };
        }

        const majorTab = document.getElementById("majorTab");
        const subjectTab = document.getElementById("subjectTab");
        const majorSection = document.getElementById("majorSection");
        const subjectSection = document.getElementById("subjectSection");

        if (majorTab && subjectTab) {
            majorTab.onclick = () => {
                majorTab.classList.add("active");
                subjectTab.classList.remove("active");

                if (majorSection) majorSection.style.display = "block";
                if (subjectSection) subjectSection.style.display = "none";

                clearResult();
            };

            subjectTab.onclick = () => {
                subjectTab.classList.add("active");
                majorTab.classList.remove("active");

                if (subjectSection) subjectSection.style.display = "block";
                if (majorSection) majorSection.style.display = "none";

                clearResult();
            };
        }

    } catch (e) {
        console.error("초기화 중 오류 발생:", e);

        showResult(`
            <p style="text-align:center; padding:20px; color:red;">
                데이터 파일을 불러오지 못했습니다.<br>
                CSV 파일 이름과 위치를 확인하세요.
            </p>
        `);
    }
});