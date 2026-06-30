/**
 * ============================================================================
 * 초등학생용 '자료 조사 및 막대그래프 보고서 만들기' 웹앱 컨트롤러
 * ============================================================================
 * 
 * [교사 설정 구역]
 * 아래의 PADLET_URL 변수를 수정하면 '패들릿에 공유하기' 버튼 클릭 시 이동할 
 * 학급 전용 패들릿 주소를 손쉽게 변경할 수 있습니다.
 */
const PADLET_URL = "https://padlet.com/jinwon30612/padlet-4rpugtk7fmhpffb3";


/**
 * ============================================================================
 * 1. 전역 상수 & 상태 관리 변수들
 * ============================================================================
 */
// 기본 제공 파스텔톤 컬러 팔레트 (막대 그래프용)
const PASTEL_COLORS = [
  { name: "파스텔 핑크", hex: "#ffb3ba" },
  { name: "파스텔 오렌지", hex: "#ffdfba" },
  { name: "파스텔 옐로우", hex: "#ffffba" },
  { name: "파스텔 민트", hex: "#baffc9" },
  { name: "파스텔 스카이", hex: "#bae1ff" },
  { name: "파스텔 퍼플", hex: "#e8c4ff" }
];

// 앱 전체 상태
const state = {
  currentStep: 1,
  direction: "vertical",      // 'vertical' (세로 막대) or 'horizontal' (가로 막대)
  gridSize: 1,                // 눈금 한 칸의 크기 (1, 2, 5, 10, 20 등)
  barWidth: 50,               // 막대 두께 (20 ~ 80px)
  bgClass: "bg-white",        // 그래프 배경 스타일 클래스
  data: [
    { name: "집", value: 4, color: "#ffb3ba" },
    { name: "공원", value: 6, color: "#ffdfba" },
    { name: "버스", value: 10, color: "#ffffba" }
  ],                          // 1단계에서 가져온 [{ name, value, color }] 형태의 데이터
  title: "주로 음악을 듣는 장소별 학생 수", // 조사 주제
  unit: "명",                 // 수량 단위
  qtyAxisName: "학생 수",       // 수량 축 이름
  itemAxisName: "장소"         // 항목 축 이름
};

/**
 * ============================================================================
 * 2. 초기화 작업 및 이벤트 리스너 등록
 * ============================================================================
 */
document.addEventListener("DOMContentLoaded", () => {
  // 오늘 날짜 설정 (Step 3 날짜 인풋 기본값)
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateInput = document.getElementById("report-date");
  if (dateInput) {
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  // 슬라이드 내비게이션 버튼
  document.getElementById("btn-prev").addEventListener("click", () => moveStep(-1));
  document.getElementById("btn-next").addEventListener("click", () => moveStep(1));

  // Step 1: 항목 추가 버튼
  document.getElementById("btn-add-row").addEventListener("click", addRow);

  // Step 2: 막대 방향 토글 버튼
  document.getElementById("btn-dir-vertical").addEventListener("click", () => changeDirection("vertical"));
  document.getElementById("btn-dir-horizontal").addEventListener("click", () => changeDirection("horizontal"));

  // Step 2: 눈금 크기 라디오/인풋 이벤트
  // Step 2: 눈금 크기 라디오 이벤트
  const gridRadios = document.getElementsByName("grid-size");

  gridRadios.forEach(radio => {
    radio.addEventListener("change", (e) => {
      state.gridSize = parseInt(e.target.value);
      renderGraph();
    });
  });

  // Step 2: 막대 두께 슬라이더
  const widthSlider = document.getElementById("slider-bar-width");
  widthSlider.addEventListener("input", (e) => {
    state.barWidth = parseInt(e.target.value);

    // UI의 텍스트 갱신 (얇게, 보통, 두껍게)
    const labelSpan = document.getElementById("bar-width-val");
    if (state.barWidth < 35) labelSpan.textContent = "얇게";
    else if (state.barWidth > 65) labelSpan.textContent = "두껍게";
    else labelSpan.textContent = "보통";

    renderGraph();
  });

  // Step 2: 그래프 배경 스타일 선택
  const bgButtons = document.querySelectorAll(".btn-bg-color");
  bgButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      bgButtons.forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");

      const selectedBg = e.target.getAttribute("data-bg");
      state.bgClass = selectedBg;
      renderGraph();
    });
  });

  // Step 3: 완성 및 저장, 패들릿 이동 버튼
  document.getElementById("btn-save-report").addEventListener("click", saveReportAsImage);
  document.getElementById("btn-go-padlet").addEventListener("click", () => {
    window.open(PADLET_URL, "_blank");
  });

  // 모달 닫기
  document.getElementById("btn-modal-close").addEventListener("click", closeModal);

  // 1단계: 표 초기 렌더링 및 메타 입력 연동
  renderInputTable();
  const metaInputs = ["input-title", "input-unit", "input-qty-axis-name", "input-item-axis-name"];
  metaInputs.forEach(id => {
    document.getElementById(id).addEventListener("input", updateTableLabels);
  });

  // '예) ...' 형태의 예시 텍스트 포커스 시 자동 삭제 및 블러 시 복원 기능
  document.addEventListener("focusin", (e) => {
    const target = e.target;
    if ((target.tagName === "INPUT" && target.type === "text") || target.tagName === "TEXTAREA") {
      if (target.value.startsWith("예)")) {
        if (!target.dataset.defaultValue) {
          target.dataset.defaultValue = target.value;
        }
        target.value = "";
        updateExampleStyle(target);
      }
    }
  });

  document.addEventListener("focusout", (e) => {
    const target = e.target;
    if ((target.tagName === "INPUT" && target.type === "text") || target.tagName === "TEXTAREA") {
      if (target.value.trim() === "" && target.dataset.defaultValue) {
        target.value = target.dataset.defaultValue;
      }
      updateExampleStyle(target);
    }
  });

  // 사용자가 직접 입력 시 실시간으로 예시 스타일(색상) 업데이트
  document.addEventListener("input", (e) => {
    updateExampleStyle(e.target);
  });

  // 페이지 로드 시 기존 예시값들의 스타일 일괄 적용
  document.querySelectorAll("input, textarea").forEach(input => {
    updateExampleStyle(input);
  });
});

/**
 * 예시 텍스트(예)로 시작)가 들어있는 입력창에 회색 글씨 스타일 클래스(.example-val) 적용/해제
 */
function updateExampleStyle(input) {
  if (input && (input.tagName === "INPUT" || input.tagName === "TEXTAREA")) {
    if (input.value && input.value.startsWith("예)")) {
      input.classList.add("example-val");
    } else {
      input.classList.remove("example-val");
    }
  }
}


/**
 * ============================================================================
 * 3. 1단계: 표 가로형 동적 렌더링 및 입력값 연동
 * ============================================================================
 */

// 1단계 가로형 표 동적 렌더링 함수
function renderInputTable() {
  const table = document.getElementById("data-table");
  if (!table) return;

  const N = state.data.length;
  const colCount = N + 2; // 축 라벨 + N개 항목 + 합계

  // 합계 자동 연산
  const sumValue = state.data.reduce((acc, curr) => acc + (curr.value || 0), 0);

  let html = "";

  // 1행: 조사 주제 (가로 전체 병합)
  const displayTitle = state.title || "조사 주제를 입력하세요";
  html += `
    <tr class="table-title-row">
      <th colspan="${colCount}" class="table-title-cell" id="table-title-cell-display">${displayTitle}</th>
    </tr>
  `;

  // 2행: 조사한 항목 이름 (장소 | 집 | 공원 | 버스 | 합계)
  const displayItemAxis = state.itemAxisName || "항목";
  html += `
    <tr class="table-item-row">
      <td class="table-axis-label" id="table-item-axis-display">${displayItemAxis}</td>
  `;
  state.data.forEach((item, idx) => {
    html += `
      <td>
        <input type="text" class="item-name" data-idx="${idx}" placeholder="예) 항목 ${idx + 1}" value="${item.name}">
      </td>
    `;
  });
  html += `
      <td class="table-sum-label">합계</td>
    </tr>
  `;

  // 3행: 수량 (학생 수(명) | 4 | 6 | 10 | 20)
  const qtyName = state.qtyAxisName || "수량";
  const unitStr = state.unit ? `(${state.unit})` : "";
  const displayQtyAxis = `${qtyName}${unitStr}`;
  html += `
    <tr class="table-value-row">
      <td class="table-axis-label" id="table-qty-axis-display">${displayQtyAxis}</td>
  `;
  state.data.forEach((item, idx) => {
    const valDisplay = item.value === 0 && item.isEmpty ? "" : item.value;
    html += `
      <td>
        <input type="number" class="item-value" data-idx="${idx}" min="0" placeholder="0" value="${valDisplay}">
      </td>
    `;
  });
  html += `
      <td class="table-sum-value" id="table-sum-value-display">${sumValue}</td>
    </tr>
  `;

  // 4행: 지우기 액션 (지우기 | 🗑️ | 🗑️ | 🗑️ | )
  html += `
    <tr class="table-action-row">
      <td class="table-action-label">지우기</td>
  `;
  state.data.forEach((item, idx) => {
    html += `
      <td>
        <button type="button" class="btn-delete-col" data-idx="${idx}">🗑️</button>
      </td>
    `;
  });
  html += `
      <td></td>
    </tr>
  `;

  table.innerHTML = html;

  // 이벤트 핸들러 연결
  const nameInputs = table.querySelectorAll(".item-name");
  nameInputs.forEach(input => {
    input.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.idx);
      state.data[idx].name = e.target.value;
      updateExampleStyle(e.target);
    });
  });

  const valueInputs = table.querySelectorAll(".item-value");
  valueInputs.forEach(input => {
    input.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.idx);
      const valStr = e.target.value.trim();
      if (valStr === "") {
        state.data[idx].value = 0;
        state.data[idx].isEmpty = true;
      } else {
        state.data[idx].value = parseInt(valStr) || 0;
        state.data[idx].isEmpty = false;
      }
      updateSumAndPreview();
    });
  });

  const deleteButtons = table.querySelectorAll(".btn-delete-col");
  deleteButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx);
      deleteCol(idx);
    });
  });

  // 예시값 스타일 일괄 적용
  table.querySelectorAll("input").forEach(input => {
    updateExampleStyle(input);
  });
}

// 합계 실시간 계산 및 그래프 미리보기 연계 함수
function updateSumAndPreview() {
  const sumDisplay = document.getElementById("table-sum-value-display");
  if (sumDisplay) {
    const sumValue = state.data.reduce((acc, curr) => acc + (curr.value || 0), 0);
    sumDisplay.textContent = sumValue;
  }
  // 실시간 그래프 리렌더링
  renderGraph();
}

// 일반 입력 필드 수정 시 가로형 표 라벨 동적 수정
function updateTableLabels() {
  syncDataFromTable();

  const titleDisplay = document.getElementById("table-title-cell-display");
  if (titleDisplay) {
    titleDisplay.textContent = state.title || "조사 주제를 입력하세요";
  }

  const itemAxisDisplay = document.getElementById("table-item-axis-display");
  if (itemAxisDisplay) {
    itemAxisDisplay.textContent = state.itemAxisName || "항목";
  }

  const qtyAxisDisplay = document.getElementById("table-qty-axis-display");
  if (qtyAxisDisplay) {
    const unitStr = state.unit ? `(${state.unit})` : "";
    qtyAxisDisplay.textContent = `${state.qtyAxisName || "수량"}${unitStr}`;
  }
}

function addRow() {
  if (state.data.length >= 10) {
    showAlert("항목은 최대 10개까지만 만들 수 있어요! 😮");
    return;
  }

  const nextIndex = state.data.length + 1;
  const defaultColor = PASTEL_COLORS[(nextIndex - 1) % PASTEL_COLORS.length].hex;

  state.data.push({
    name: "",
    value: 0,
    color: defaultColor,
    isEmpty: true
  });

  renderInputTable();
  renderGraph();
}

function deleteCol(idx) {
  if (state.data.length <= 1) {
    showAlert("최소한 1개 이상의 항목은 있어야 해요! 😢");
    return;
  }

  state.data.splice(idx, 1);
  renderInputTable();
  renderGraph();
}

function deleteRow(button) {
  // 사용되지 않으나 혹시 모를 에러 방지를 위해 빈 함수로 둡니다.
}

/**
 * 표 입력란에서 데이터를 파싱하여 state.data에 채워넣음
 */
function syncDataFromTable() {
  let title = document.getElementById("input-title").value.trim();
  if (title.startsWith("예)")) {
    title = title.replace(/^예\)\s*/, "");
  }
  state.title = title;

  let unit = document.getElementById("input-unit").value.trim();
  if (unit.startsWith("예)")) {
    unit = unit.replace(/^예\)\s*/, "");
  }
  state.unit = unit;

  let qtyAxisName = document.getElementById("input-qty-axis-name").value.trim();
  if (qtyAxisName.startsWith("예)")) {
    qtyAxisName = qtyAxisName.replace(/^예\)\s*/, "");
  }
  state.qtyAxisName = qtyAxisName;

  let itemAxisName = document.getElementById("input-item-axis-name").value.trim();
  if (itemAxisName.startsWith("예)")) {
    itemAxisName = itemAxisName.replace(/^예\)\s*/, "");
  }
  state.itemAxisName = itemAxisName;
}


/**
 * ============================================================================
 * 4. 2단계: 꾸미기 패널 설정 제어
 * ============================================================================
 */
function changeDirection(dir) {
  state.direction = dir;

  const btnV = document.getElementById("btn-dir-vertical");
  const btnH = document.getElementById("btn-dir-horizontal");

  if (dir === "vertical") {
    btnV.classList.add("active");
    btnH.classList.remove("active");
  } else {
    btnH.classList.add("active");
    btnV.classList.remove("active");
  }

  renderGraph();
}

/**
 * 항목별 막대 색상을 바꿀 수 있는 컬러 피커 칩 동적 생성
 */
function buildColorPickerPanel() {
  const listContainer = document.getElementById("color-picker-list");
  listContainer.innerHTML = "";

  state.data.forEach((item, itemIdx) => {
    // 항목 이름이 비어있으면 표시 생략
    const displayName = item.name || `항목 ${itemIdx + 1}`;

    const pickerRow = document.createElement("div");
    pickerRow.className = "color-picker-row";

    const labelSpan = document.createElement("span");
    labelSpan.textContent = displayName;
    pickerRow.appendChild(labelSpan);

    const chipsWrapper = document.createElement("div");
    chipsWrapper.className = "chips-wrapper";

    PASTEL_COLORS.forEach(colorObj => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "color-chip";
      chip.style.backgroundColor = colorObj.hex;
      chip.title = colorObj.name;

      if (item.color === colorObj.hex) {
        chip.classList.add("active");
      }

      chip.addEventListener("click", () => {
        // 색상 변경
        state.data[itemIdx].color = colorObj.hex;

        // 현재 행의 칩 활성화 상태 갱신
        chipsWrapper.querySelectorAll(".color-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");

        // 즉시 그래프 리렌더링
        renderGraph();
      });

      chipsWrapper.appendChild(chip);
    });

    pickerRow.appendChild(chipsWrapper);
    listContainer.appendChild(pickerRow);
  });
}


/**
 * ============================================================================
 * 5. 막대그래프 렌더링 코어 (모눈종이 정교화)
 * ============================================================================
 */
function renderGraph() {
  const wrappers = document.querySelectorAll(".preview-graph-wrapper");

  wrappers.forEach(wrapper => {
    const previewTitle = wrapper.parentElement.querySelector(".graph-title-label") || wrapper.querySelector(".graph-title-label");
    const previewUnit = wrapper.querySelector(".graph-unit-label");
    const gridLayer = wrapper.querySelector(".grid-lines");
    const barsLayer = wrapper.querySelector(".bars-layer");
    const container = wrapper.querySelector(".graph-container");
    wrapper.classList.forEach(className => {
      if (className.startsWith("bg-")) {
        wrapper.classList.remove(className);
      }
    });
    wrapper.classList.add(state.bgClass);
    const containerOuter = wrapper.querySelector(".graph-container-outer");
    const yAxisContainer = wrapper.querySelector(".y-axis-labels-container");
    const xAxisContainer = wrapper.querySelector(".x-axis-labels-container");
    const cornerBox = wrapper.querySelector(".axis-corner-box");

    // 막대 방향에 따른 wrapper 클래스 제어
    if (state.direction === "vertical") {
      wrapper.classList.remove("horizontal-mode");
      wrapper.classList.add("vertical-mode");
    } else {
      wrapper.classList.remove("vertical-mode");
      wrapper.classList.add("horizontal-mode");
    }

    // 타이틀 & 단위 매핑
    if (previewTitle) {
      previewTitle.textContent = state.title || "(조사 주제 없음)";
    }
    if (previewUnit) {
      previewUnit.textContent = state.unit ? `(단위: ${state.unit})` : "";
    }

    // 대각선 코너 박스 축 이름 업데이트
    if (cornerBox) {
      const verticalLabel = cornerBox.querySelector(".vertical-name");
      const horizontalLabel = cornerBox.querySelector(".horizontal-name");
      if (state.direction === "vertical") {
        verticalLabel.textContent = state.qtyAxisName || "학생 수";
        horizontalLabel.textContent = state.itemAxisName || "과일";
      } else {
        verticalLabel.textContent = state.itemAxisName || "과일";
        horizontalLabel.textContent = state.qtyAxisName || "학생 수";
      }
    }

    // 레이어 비우기
    gridLayer.innerHTML = "";
    barsLayer.innerHTML = "";
    yAxisContainer.innerHTML = "";
    xAxisContainer.innerHTML = "";

    // 1. 최대값 구하기
    let maxVal = 0;
    state.data.forEach(d => {
      if (d.value > maxVal) maxVal = d.value;
    });

    // 데이터가 아예 없거나 최대값이 0이면 최소치 10으로 잡고 렌더링
    if (maxVal === 0) maxVal = 10;

    // 2. 눈금 크기(간격) 및 눈금 최대 한계점(maxAxisLimit) 계산
    const stepSize = state.gridSize || 1;
    const majorInterval = stepSize * 5; // 한 칸당 크기의 5배를 주요 눈금으로

    let numMajorIntervals = Math.ceil(maxVal / majorInterval);
    if (numMajorIntervals < 1) numMajorIntervals = 1; // 최소 한 주기 표시
    const maxAxisLimit = numMajorIntervals * majorInterval;

    const numGridLines = maxAxisLimit / stepSize;

    // 3. 그래프 모드에 맞춰 눈금 격자 및 라벨 렌더링
    if (state.direction === "vertical") {
      // -------------------------------------------------------------
      // 세로 막대그래프 모드
      // -------------------------------------------------------------
      containerOuter.style.gridTemplateColumns = "65px 1fr";
      containerOuter.style.gridTemplateRows = "1fr 45px";

      container.style.flexDirection = "column";
      barsLayer.className = "bars-layer vertical-mode";

      // 3-1. Y축 격자선(가로선) & Y축 숫자 라벨 렌더링 (아래에서 위로)
      for (let i = 0; i <= numGridLines; i++) {
        const gridValue = i * stepSize;
        const ratio = gridValue / maxAxisLimit;
        const bottomPercent = ratio * 100;
        const isMajor = (gridValue % majorInterval === 0);

        // 격자 가로선 (0위치 제외 - 바닥 테두리와 겹침 방지)
        if (gridValue > 0) {
          const line = document.createElement("div");
          line.className = `grid-line horizontal ${isMajor ? 'major' : 'minor'}`; // 숫자가 나오는 주선은 실선(major), 나머지는 점선(minor)
          line.style.bottom = `${bottomPercent}%`;
          gridLayer.appendChild(line);
        }

        // Y축 라벨 숫자 (주요 실선 옆에만 표시)
        if (isMajor) {
          const label = document.createElement("div");
          label.className = "axis-label y-axis";
          label.style.bottom = `${bottomPercent}%`;
          label.textContent = gridValue;
          label.setAttribute("data-value", gridValue);
          yAxisContainer.appendChild(label);
        }
      }

      // 3-2. X축 세로 격자선 그리기 (막대 사이 구분용 solid vertical lines)
      const itemCount = state.data.length;
      for (let i = 1; i < itemCount; i++) {
        const leftPercent = (i / itemCount) * 100;
        const line = document.createElement("div");
        line.className = "grid-line vertical major"; // solid line going all the way up
        line.style.left = `calc(${leftPercent}% - 2px)`; // 테두리 두께 보정으로 완벽히 정렬
        gridLayer.appendChild(line);
      }

      // 3-3. 세로 막대 바 렌더링
      state.data.forEach((item, idx) => {
        const itemVal = item.value || 0;
        const heightRatio = itemVal / maxAxisLimit;
        const heightPercent = heightRatio * 100;

        // 막대 컨테이너 (정렬용)
        const barContainer = document.createElement("div");
        barContainer.className = "graph-bar-container";
        barContainer.style.width = `${100 / itemCount}%`;

        // 막대 엘리먼트
        const bar = document.createElement("div");
        bar.className = "graph-bar";
        bar.style.height = `${heightPercent}%`;
        bar.style.width = `${state.barWidth}%`; // 두께 설정 반영
        bar.style.backgroundColor = item.color;

        // 마우스 오버 툴팁
        const tooltip = document.createElement("div");
        tooltip.className = "bar-tooltip";
        tooltip.innerHTML = `<strong>${item.name || '(이름 없음)'}</strong><br>${itemVal}${state.unit || ''}`;
        bar.appendChild(tooltip);

        barContainer.appendChild(bar);
        barsLayer.appendChild(barContainer);

        // X축 텍스트 라벨 (항목 이름 - 개별 셀에 담아 border-right로 세로선 연장)
        const xCell = document.createElement("div");
        xCell.className = "x-axis-cell";
        xCell.style.width = `${100 / itemCount}%`;

        const labelText = document.createElement("span");
        labelText.textContent = item.name || `항목 ${idx + 1}`;
        xCell.appendChild(labelText);

        xAxisContainer.appendChild(xCell);
      });

    } else {
      // -------------------------------------------------------------
      // 가로 막대그래프 모드
      // -------------------------------------------------------------
      containerOuter.style.gridTemplateColumns = "85px 1fr";
      containerOuter.style.gridTemplateRows = "1fr 45px";

      barsLayer.className = "bars-layer horizontal-mode";

      // 3-1. X축 격자선(세로선) & X축 숫자 라벨 렌더링 (왼쪽에서 오른쪽으로)
      for (let i = 0; i <= numGridLines; i++) {
        const gridValue = i * stepSize;
        const ratio = gridValue / maxAxisLimit;
        const leftPercent = ratio * 100;
        const isMajor = (gridValue % majorInterval === 0);

        // 격자 세로선 (0위치 제외 - 좌측 테두리와 겹침 방지)
        if (gridValue > 0) {
          const line = document.createElement("div");
          line.className = `grid-line vertical ${isMajor ? 'major' : 'minor'}`; // 숫자가 나오는 주선은 실선(major), 나머지는 점선(minor)
          line.style.left = `${leftPercent}%`;
          gridLayer.appendChild(line);
        }

        // X축 라벨 숫자 (주요 실선 옆에만 표시)
        if (isMajor) {
          const label = document.createElement("div");
          label.className = "axis-label x-axis horizontal-num";
          label.style.left = `${leftPercent}%`;
          label.textContent = gridValue;
          label.setAttribute("data-value", gridValue);
          xAxisContainer.appendChild(label);
        }
      }

      // 3-2. Y축 가로 격자선 그리기 (행 구분용 solid horizontal lines)
      const itemCount = state.data.length;
      for (let i = 1; i < itemCount; i++) {
        const bottomPercent = (i / itemCount) * 100;
        const line = document.createElement("div");
        line.className = "grid-line horizontal major"; // solid line going all the way right
        line.style.bottom = `${bottomPercent}%`; // 셀 경계와 완전 일치하도록 수정
        gridLayer.appendChild(line);
      }

      // 3-3. 가로 막대 바 렌더링
      state.data.forEach((item, idx) => {
        const itemVal = item.value || 0;
        const widthRatio = itemVal / maxAxisLimit;
        const widthPercent = widthRatio * 100;

        // 막대 컨테이너 (정렬용)
        const barContainer = document.createElement("div");
        barContainer.className = "graph-bar-container";
        barContainer.style.height = `${100 / itemCount}%`;

        // 막대 엘리먼트
        const bar = document.createElement("div");
        bar.className = "graph-bar";
        bar.style.width = `${widthPercent}%`;
        bar.style.height = `${state.barWidth}%`; // 두께 설정 반영
        bar.style.backgroundColor = item.color;

        // 마우스 오버 툴팁
        const tooltip = document.createElement("div");
        tooltip.className = "bar-tooltip";
        tooltip.innerHTML = `<strong>${item.name || '(이름 없음)'}</strong><br>${itemVal}${state.unit || ''}`;
        bar.appendChild(tooltip);

        barContainer.appendChild(bar);
        barsLayer.appendChild(barContainer);

        // Y축 텍스트 라벨 (항목 이름 - 개별 셀에 담아 border-bottom으로 가로선 연장)
        const yCell = document.createElement("div");
        yCell.className = "y-axis-cell";
        yCell.style.height = `${100 / itemCount}%`;

        const labelText = document.createElement("span");
        labelText.textContent = item.name || `항목 ${idx + 1}`;
        yCell.appendChild(labelText);

        yAxisContainer.appendChild(yCell);
      });
    }
  });
}


/**
 * ============================================================================
 * 6. 3단계: 최종 보고서 데이터 동기화 및 렌더링
 * ============================================================================
 */
function syncAndBuildReport() {
  // 1. 조사 주제 제목
  const titleDisplay = document.getElementById("report-title-display");
  titleDisplay.textContent = state.title || "막대그래프 수학 탐구 보고서";

  // 2. 그래프 영역 복제하여 꽂아넣기
  const reportGraphHolder = document.getElementById("report-graph-holder");
  reportGraphHolder.innerHTML = "";

  // Step 3의 프리뷰 그래프 영역 복제 (이것이 최종 디자인 반영된 그래프)
  const graphClone = document.getElementById("preview-graph-wrapper-step3").cloneNode(true);

  // 복제된 그래프에서 아이디 변경 및 클래스 정리
  graphClone.id = "report-graph-wrapper";
  graphClone.classList.remove("preview-graph-wrapper");

  reportGraphHolder.appendChild(graphClone);
}


/**
 * ============================================================================
 * 7. 단계 전환 및 슬라이드 제어 로직 (유효성 검사 포함)
 * ============================================================================
 */
function moveStep(direction) {
  const nextStep = state.currentStep + direction;

  // 인덱스 초과 방지
  if (nextStep < 1 || nextStep > 4) return;

  // 다음 단계로 진입할 때 유효성 검사 진행
  if (direction === 1) {
    if (state.currentStep === 1) {
      if (!validateStep1()) return; // 1단계 오류 시 차단
    }
  }

  // 4단계 진입 전에 최신 내용으로 보고서 동기화
  if (nextStep === 4) {
    syncAndBuildReport();
  }

  // 2단계 또는 3단계 진입 시 컬러 칩 패널 동적 생성 및 그래프 최초 렌더링
  if (nextStep === 2 || nextStep === 3) {
    syncDataFromTable();
    buildColorPickerPanel();
    renderGraph();
  }

  // 실제 슬라이더 이동 (4단계이므로 각 슬라이드는 25%씩)
  const sliderWrapper = document.getElementById("slider-wrapper");
  const translateXVal = -(nextStep - 1) * 25;
  sliderWrapper.style.transform = `translateX(${translateXVal}%)`;

  // 상태 업데이트 및 내비게이션 바 상태 제어
  state.currentStep = nextStep;
  updateIndicator();
  updateNavButtons();
}

/**
 * 1단계 자료 입력 유효성 검사 (초등학생을 위한 쉬운 안내)
 */
function validateStep1() {
  // 실시간 동기화 먼저 수행
  syncDataFromTable();

  // 1. 조사 주제 체크
  if (!state.title) {
    showAlert("조사 주제를 써 주세요! 📝<br>예) '우리 반 친구들이 좋아하는 운동'");
    return false;
  }

  // 2. 단위 체크
  if (!state.unit) {
    showAlert("단위를 써 주세요! 🏷️<br>예) '명', '개', '권' 등");
    return false;
  }

  // 2-1. 축 이름 체크
  if (!state.qtyAxisName) {
    showAlert("수량을 나타내는 축 이름을 써 주세요! 📊<br>예) '학생 수', '물건 수' 등");
    return false;
  }
  if (!state.itemAxisName) {
    showAlert("항목을 나타내는 축 이름을 써 주세요! 🍎<br>예) '과일', '운동' 등");
    return false;
  }

  // 3. 입력된 항목 데이터 체크
  if (state.data.length === 0) {
    showAlert("조사한 자료를 표에 최소한 1개 이상 입력해 주세요! ➕");
    return false;
  }

  // 빈 항목 이름 또는 이상값 체크
  let hasEmptyName = false;
  let hasInvalidVal = false;
  let hasNegativeVal = false;

  state.data.forEach((item, idx) => {
    if (!item.name) {
      hasEmptyName = true;
    }
    // 수량이 숫자가 아니거나 공백인 경우
    if (isNaN(item.value) || item.value === null) {
      hasInvalidVal = true;
    }
    if (item.value < 0) {
      hasNegativeVal = true;
    }
  });

  if (hasEmptyName) {
    showAlert("조사한 항목의 이름을 비워둘 수 없어요! 채워 주세요! ✍️");
    return false;
  }

  if (hasInvalidVal) {
    showAlert("수량은 숫자(0 이상의 수)만 적을 수 있어요! 🔢");
    return false;
  }

  if (hasNegativeVal) {
    showAlert("수량은 0보다 작을 수 없어요! 올바른 숫자를 적어 주세요! 📈");
    return false;
  }

  return true;
}

/**
 * 상단 인디케이터 클래스 활성화 제어
 */
function updateIndicator() {
  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById(`dot-${i}`);
    const lineBefore = document.getElementById(`line-${i - 1}`); // line-1, line-2, line-3

    if (i < state.currentStep) {
      dot.className = "step-dot completed";
      if (lineBefore) lineBefore.className = "step-line completed";
    } else if (i === state.currentStep) {
      dot.className = "step-dot active";
      if (lineBefore) lineBefore.className = "step-line";
    } else {
      dot.className = "step-dot";
      if (lineBefore) lineBefore.className = "step-line";
    }
  }
}

/**
 * 하단 내비게이션 바 버튼 제어
 */
function updateNavButtons() {
  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");
  const step3Actions = document.getElementById("step3-actions");

  // 이전 버튼: 1단계에서는 숨김, 2, 3, 4단계 노출
  if (state.currentStep === 1) {
    btnPrev.style.display = "none";
  } else {
    btnPrev.style.display = "flex";
  }

  // 다음 버튼 및 최종 단계 버튼 제어
  if (state.currentStep === 4) {
    btnNext.style.display = "none";
    step3Actions.style.display = "flex";
  } else {
    btnNext.style.display = "flex";
    step3Actions.style.display = "none";
  }
}


/**
 * ============================================================================
 * 8. 유틸리티 기능 (커스텀 경고 모달창 & 이미지 저장)
 * ============================================================================
 */
function showAlert(message) {
  const modal = document.getElementById("alert-modal");
  const msgP = document.getElementById("alert-message");

  msgP.innerHTML = message;
  modal.classList.add("show");
}

function closeModal() {
  const modal = document.getElementById("alert-modal");
  modal.classList.remove("show");
}

/**
 * 최종 보고서 영역을 캡처하여 다운로드
 */
function saveReportAsImage() {
  const captureArea = document.getElementById("report-capture-area");

  // 캡처 진행 중 로딩 피드백 대용 알림
  const saveBtn = document.getElementById("btn-save-report");
  const originalText = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = "💾 이미지 저장 중...";

  // html2canvas 옵션 설정: 디바이스 픽셀 비율을 올려서 고해상도 캡처
  const options = {
    useCORS: true,
    scale: 2,
    backgroundColor: "#ffffff",
    // input 요소의 실시간 입력값을 화면 그대로 캡처에 복사하기 위한 전처리
    onclone: (clonedDoc) => {
      // 복제된 문서에서 input, textarea 요소의 현재 입력값을 placeholder나 static text로 변환하여 렌더링 누락 방지
      const clonedInputs = clonedDoc.querySelectorAll(".inline-meta-input, .plan-input");
      clonedInputs.forEach(input => {
        let val = input.value;
        // '예)' 접두사 제거
        if (val.startsWith("예)")) {
          val = val.replace(/^예\)\s*/, "");
        }
        const span = clonedDoc.createElement("span");
        span.textContent = val || " ";
        span.className = input.className;
        span.style.borderBottom = "none";
        span.style.display = "inline-block";
        span.style.textAlign = "center";
        span.style.padding = "2px 8px";
        span.style.fontWeight = "bold";
        span.style.color = "var(--primary-color)";
        input.parentNode.replaceChild(span, input);
      });

      const clonedTextarea = clonedDoc.querySelector(".analysis-textarea");
      if (clonedTextarea) {
        const val = clonedTextarea.value;
        const div = clonedDoc.createElement("div");
        div.className = clonedTextarea.className;
        div.style.whiteSpace = "pre-wrap";
        div.style.minHeight = "120px";
        div.textContent = val || clonedTextarea.placeholder;
        clonedTextarea.parentNode.replaceChild(div, clonedTextarea);
      }
    }
  };

  html2canvas(captureArea, options).then(canvas => {
    // 캔버스 데이터를 이미지 데이터 URL로 변환
    const imgData = canvas.toDataURL("image/png");

    // 다운로드용 가상 링크 엘리먼트 생성
    const link = document.createElement("a");

    // 파일명 지정: [조사주제]_보고서.png
    const sanitizedTitle = state.title.replace(/[\\/:*?"<>|]/g, "_"); // 파일명 금지 문자 치환
    link.download = `${sanitizedTitle || '막대그래프'}_보고서.png`;
    link.href = imgData;

    // 다운로드 실행
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 버튼 원상복귀
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalText;

    // 성공 안내창
    showAlert("🎉 보고서가 컴퓨터에 이미지 파일로 저장되었어요!<br>이제 패들릿에 공유하기 버튼을 눌러 제출해 보세요!");
  }).catch(err => {
    console.error("캡처 실패: ", err);
    showAlert("😢 보고서 저장에 실패했어요. 다시 시도해 주세요.");
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalText;
  });
}
