const NUM_WEEKS = 4;
let currentMonth = 1;
let currentWeek = 1;

const months = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function getTasks() {
  return JSON.parse(localStorage.getItem("custom_tasks") || "[]");
}

function saveTasks(tasks) {
  localStorage.setItem("custom_tasks", JSON.stringify(tasks));
}

function init() {
  renderAll();
  renderTaskEditor();
}

function updateDisplay() {
  document.getElementById("weekDisplay").textContent = `Semana ${currentWeek}`;
  document.getElementById("monthDisplay").textContent =
    months[currentMonth - 1];
}

function previousWeek() {
  if (currentWeek > 1) {
    currentWeek--;
  } else if (currentMonth > 1) {
    currentMonth--;
    currentWeek = NUM_WEEKS;
  }
  renderAll();
}

function nextWeek() {
  if (currentWeek < NUM_WEEKS) {
    currentWeek++;
  } else if (currentMonth < months.length) {
    currentMonth++;
    currentWeek = 1;
  }
  renderAll();
}

function renderAll() {
  renderTable();
  updateDisplay();
  generateDailyCharts();
  generateSummaryCharts();
  generateAnnualChart();
}

function getStorageKey(month = currentMonth, week = currentWeek) {
  return `mes_${month}_semana_${week}`;
}

function renderTable() {
  const container = document.getElementById("checklistContainer");
  container.innerHTML = "";

  const tasks = getTasks();
  const table = document.createElement("table");
  const thead = table.createTHead();
  const tbody = table.createTBody();

  const headRow = thead.insertRow();
  headRow.insertCell().textContent = "Horário";
  days.forEach((day) => (headRow.insertCell().textContent = day));

  tasks.forEach((task, row) => {
    const tr = tbody.insertRow();
    tr.insertCell().textContent = `${task.start} - ${task.end} (${task.name})`;

    days.forEach((_, col) => {
      const cell = tr.insertCell();
      const btn = document.createElement("button");

      const isEnabled = (task.days || []).includes(col);
      if (isEnabled) {
        btn.onclick = () => toggleStatus(row, col);
        const status = getStatus(row, col);
        updateButtonStyle(btn, status);
      } else {
        btn.disabled = true;
        btn.textContent = "-";
        btn.style.backgroundColor = "#e0e0e0";
      }

      cell.appendChild(btn);
    });
  });

  container.appendChild(table);
}

function getStatus(row, col) {
  const data = JSON.parse(localStorage.getItem(getStorageKey()) || "{}");
  return data[`${row}_${col}`] || "pendente";
}

function toggleStatus(row, col) {
  const key = getStorageKey();
  const data = JSON.parse(localStorage.getItem(key) || "{}");
  const cellKey = `${row}_${col}`;
  const current = data[cellKey] || "pendente";
  const next =
    current === "pendente"
      ? "feita"
      : current === "feita"
      ? "nao_feita"
      : "pendente";
  data[cellKey] = next;
  localStorage.setItem(key, JSON.stringify(data));
  renderAll();
}

function updateButtonStyle(btn, status) {
  btn.textContent =
    status === "feita" ? "✓" : status === "nao_feita" ? "✗" : "-";
  btn.style.backgroundColor =
    status === "feita"
      ? "#4caf50"
      : status === "nao_feita"
      ? "#f44336"
      : "#ffc107";
}

function generateDailyCharts() {
  const container = document.getElementById("dailyCharts");
  container.innerHTML = "";

  for (let col = 0; col < days.length; col++) {
    let feita = 0,
      naoFeita = 0,
      pendente = 0;
    const tasks = getTasks();

    for (let row = 0; row < tasks.length; row++) {
      if (!(tasks[row].days || []).includes(col)) continue;
      const status = getStatus(row, col);
      if (status === "feita") feita++;
      else if (status === "nao_feita") naoFeita++;
      else pendente++;
    }

    const canvas = document.createElement("canvas");
    container.appendChild(canvas);

    renderPieChart(canvas, days[col], { feita, nao_feita: naoFeita, pendente });
  }
}

function generateSummaryCharts() {
  const weekCanvas = document.getElementById("weeklyChart");
  const monthCanvas = document.getElementById("monthlyChart");

  const weekData = countStatus(currentMonth, currentWeek);
  const monthData = { feita: 0, nao_feita: 0, pendente: 0 };

  for (let w = 1; w <= NUM_WEEKS; w++) {
    const data = countStatus(currentMonth, w);
    monthData.feita += data.feita;
    monthData.nao_feita += data.nao_feita;
    monthData.pendente += data.pendente;
  }

  renderPieChart(weekCanvas, "Resumo Semanal", weekData);
  renderPieChart(monthCanvas, "Resumo Mensal", monthData);
}

function generateAnnualChart() {
  const canvas = document.getElementById("annualChart");
  const annualData = { feita: 0, nao_feita: 0, pendente: 0 };

  for (let m = 1; m <= 12; m++) {
    for (let w = 1; w <= NUM_WEEKS; w++) {
      const data = countStatus(m, w);
      annualData.feita += data.feita;
      annualData.nao_feita += data.nao_feita;
      annualData.pendente += data.pendente;
    }
  }

  renderPieChart(canvas, "Resumo Anual", annualData);
}

function countStatus(month, week) {
  const data = JSON.parse(
    localStorage.getItem(getStorageKey(month, week)) || "{}"
  );
  const tasks = getTasks();
  let feita = 0,
    nao_feita = 0,
    pendente = 0;

  for (let row = 0; row < tasks.length; row++) {
    for (let col = 0; col < days.length; col++) {
      if (!(tasks[row].days || []).includes(col)) continue;
      const key = `${row}_${col}`;
      const status = data[key] || "pendente";
      if (status === "feita") feita++;
      else if (status === "nao_feita") nao_feita++;
      else pendente++;
    }
  }

  return { feita, nao_feita, pendente };
}

function renderPieChart(canvas, title, data) {
  if (canvas.chartInstance) {
    canvas.chartInstance.destroy();
  }

  const chart = new Chart(canvas, {
    type: "pie",
    data: {
      labels: ["Feita", "Não feita", "Pendente"],
      datasets: [
        {
          data: [data.feita, data.nao_feita, data.pendente],
          backgroundColor: ["#4caf50", "#f44336", "#ffc107"],
        },
      ],
    },
    options: {
      plugins: {
        title: { display: true, text: title },
        datalabels: {
          formatter: (val, ctx) => {
            const total = ctx.chart.data.datasets[0].data.reduce(
              (a, b) => a + b,
              0
            );
            return total ? `${Math.round((val / total) * 100)}%` : "0%";
          },
          color: "#000",
        },
      },
    },
    plugins: [ChartDataLabels],
  });

  canvas.chartInstance = chart;
}

function renderTaskEditor() {
  const container = document.getElementById("taskEditor");
  container.innerHTML = "";
  const tasks = getTasks();

  tasks.forEach((task, index) => {
    const row = document.createElement("div");
    row.className = "task-editor-row";

    const name = document.createElement("input");
    name.value = task.name;
    name.placeholder = "Nome";
    name.oninput = () => {
      task.name = name.value;
      saveTasks(tasks);
      renderAll();
    };

    const start = document.createElement("input");
    start.type = "time";
    start.value = task.start;
    start.oninput = () => {
      task.start = start.value;
      saveTasks(tasks);
      renderAll();
    };

    const end = document.createElement("input");
    end.type = "time";
    end.value = task.end;
    end.oninput = () => {
      task.end = end.value;
      saveTasks(tasks);
      renderAll();
    };

    const checkboxGroup = document.createElement("div");
    checkboxGroup.className = "day-checkboxes";
    task.days = task.days || [];

    days.forEach((day, col) => {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = task.days.includes(col);
      checkbox.onchange = () => {
        if (checkbox.checked) task.days.push(col);
        else task.days = task.days.filter((d) => d !== col);
        saveTasks(tasks);
        renderAll();
      };
      label.append(checkbox, day);
      checkboxGroup.appendChild(label);
    });

    const remove = document.createElement("button");
    remove.textContent = "Remover";
    remove.onclick = () => {
      tasks.splice(index, 1);
      saveTasks(tasks);
      renderAll();
      renderTaskEditor();
    };

    row.append(name, start, end, checkboxGroup, remove);
    container.appendChild(row);
  });
}

function addNewTask() {
  const tasks = getTasks();
  tasks.push({ name: "Nova tarefa", start: "00:00", end: "00:00", days: [] });
  saveTasks(tasks);
  renderAll();
  renderTaskEditor();
}

window.onload = init;
