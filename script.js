const FILES = {
    math: "math_subjects.csv",
    hierarchy: "math_hierarchy.csv",
    majors: "major_recommendations.csv",
    aliases: "major_alias.csv"
};

let mathRows = [], hierarchyRows = [], majorRows = [], aliasRows = [];

// CSV 파싱 함수
async function loadCsv(file) {
    try {
        const response = await fetch(file);
        if (!response.ok) throw new Error(`파일을 찾을 수 없습니다: ${file}`);
        const text = await response.text();
        const rows = text.split('\n').filter(row => row.trim() !== '');
        const headers = rows[0].split(',').map(h => h.trim());
        
        return rows.slice(1).map(row => {
            const values = row.split(',').map(v => v.trim());
            const obj = {};
            headers.forEach((header, i) => {
                obj[header] = values[i] || "";
            });
            return obj;
        });
    } catch (error) {
        console.error("데이터 로드 중 오류 발생:", error);
        return [];
    }
}

// 초기화 함수
async function init() {
    [mathRows, hierarchyRows, majorRows, aliasRows] = await Promise.all([
        loadCsv(FILES.math),
        loadCsv(FILES.hierarchy),
        loadCsv(FILES.majors),
        loadCsv(FILES.aliases)
    ]);
    console.log("데이터 로드 완료");
    bindEvents();
}

// 이벤트 바인딩
function bindEvents() {
    // 1. 탭 전환 로직
    const majorTab = document.getElementById("majorTab");
    const subjectTab = document.getElementById("subjectTab");
    const majorSection = document.getElementById("majorSection");
    const subjectSection = document.getElementById("subjectSection");

    majorTab.addEventListener("click", () => {
        majorTab.classList.add("active");
        subjectTab.classList.remove("active");
        majorSection.style.display = "block";
        subjectSection.style.display = "none";
    });

    subjectTab.addEventListener("click", () => {
        subjectTab.classList.add("active");
        majorTab.classList.remove("active");
        subjectSection.style.display = "block";
        majorSection.style.display = "none";
    });

    // 2. 검색 및 초기화 버튼 이벤트 (HTML ID와 일치시킴)
    document.getElementById("majorSearchBtn").addEventListener("click", searchMajor);
    document.getElementById("majorResetBtn").addEventListener("click", () => {
        document.getElementById("majorInput").value = "";
        document.getElementById("majorResult").innerHTML = "";
    });

    document.getElementById("subjectSearchBtn").addEventListener("click", searchSubject);
    document.getElementById("subjectResetBtn").addEventListener("click", () => {
        document.getElementById("subjectInput").value = "";
        document.getElementById("subjectResult").innerHTML = "";
    });

    // 엔터키 검색 지원
    document.getElementById("majorInput").addEventListener("keypress", (e) => {
        if (e.key === 'Enter') searchMajor();
    });
    document.getElementById("subjectInput").addEventListener("keypress", (e) => {
        if (e.key === 'Enter') searchSubject();
    });
}

// 전공 검색 로직
function searchMajor() {
    const query = document.getElementById("majorInput").value.trim();
    if (!query) return;

    const out = document.getElementById("majorResult");
    
    // 별칭 찾기
    const aliasMatch = aliasRows.find(a => 
        a["대표전공"].includes(query) || a["별칭"].includes(query) || a["검색어"].includes(query)
    );
    
    const searchTerm = aliasMatch ? aliasMatch["대표전공"] : query;

    const filtered = majorRows.filter(r => 
        r["모집단위1"].includes(searchTerm) || 
        r["모집단위2"].includes(searchTerm) ||
        r["대학명"].includes(searchTerm)
    );

    if (filtered.length === 0) {
        out.innerHTML = `<div class="no-result">검색 결과가 없습니다.</div>`;
        return;
    }

    let html = `<h3>'${searchTerm}' 검색 결과 (${filtered.length}건)</h3>`;
    filtered.forEach(r => {
        html += `
            <div class="result-card">
                <div class="card-header">${r["대학명"]} - ${r["모집단위1"]} (${r["모집단위2"]})</div>
                <div class="card-body">
                    <p><strong>📍 권역/지역:</strong> ${r["권역"]} / ${r["지역"]}</p>
                    <p><strong>✅ 핵심과목:</strong> <span class="highlight">${r["핵심과목"]}</span></p>
                    <p><strong>💡 권장과목:</strong> ${r["권장과목"]}</p>
                    ${r["비고"] ? `<p class="memo">※ ${r["비고"]}</p>` : ""}
                </div>
            </div>
        `;
    });
    out.innerHTML = html;
}

// 수학 과목 검색 로직
function searchSubject() {
    const query = document.getElementById("subjectInput").value.trim();
    if (!query) return;

    const out = document.getElementById("subjectResult");
    
    const subject = mathRows.find(s => 
        s["과목명"].includes(query) || (s["별칭"] && s["별칭"].includes(query))
    );

    const hierarchy = hierarchyRows.find(h => 
        h["과목명"].includes(query) || (h["별칭"] && h["별칭"].includes(query))
    );

    if (!subject) {
        out.innerHTML = `<div class="no-result">해당 과목 정보를 찾을 수 없습니다.</div>`;
        return;
    }

    let html = `
        <div class="result-card subject-card">
            <div class="card-header">📘 ${subject["과목명"]} (${subject["구분"]})</div>
            <div class="card-body">
                <p><strong>📊 성적처리:</strong> ${subject["성적처리"]}</p>
                <p><strong>📝 수능관련:</strong> ${subject["수능관련"]}</p>
                <p><strong>🔍 주요내용:</strong> ${subject["설명"]}</p>
                <p><strong>🎓 관련학과:</strong> ${subject["관련학과"]}</p>
                ${hierarchy ? `
                    <div class="hierarchy-box">
                        <p><strong>↑ 선수과목:</strong> ${hierarchy["선수과목"] || "없음"}</p>
                        <p><strong>↓ 후속과목:</strong> ${hierarchy["후속과목"] || "없음"}</p>
                        <p><strong>💡 흐름:</strong> ${hierarchy["설명"]}</p>
                    </div>
                ` : ""}
            </div>
        </div>
    `;
    out.innerHTML = html;
}

// 페이지 로드 시 실행
window.onload = init;