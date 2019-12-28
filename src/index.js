// Packages
// Helpers
import { getDates, getData, convertData, transformData } from "./helpers";

const apiUrl = "https://damp-reaches-06511.herokuapp.com";

const currentDay = new Date().getUTCDate();
const currentMonth = new Date().getUTCMonth() + 1;

const currentYear = new Date().getUTCFullYear();

let teamLabel = "Team Jedi";

const setLabel = label => {
  teamLabel = label;
};

const doneIssueLabel = "Done Dev";

const getContent = async () => {
  const [milestone] = await fetch(`${apiUrl}/milestone`).then(r => r.json());

  const issues = await fetch(`${apiUrl}/issues`).then(r => r.json());

  const labels = (await fetch(`${apiUrl}/labels`).then(r => r.json())).filter(
    e => e.name === teamLabel
  );

  const {
    startYear,
    startDay,
    endDay,
    startMonth,
    endMonth,
    endYear
  } = getDates(milestone);

  if (startYear === endYear && startMonth === endMonth) {
    const [idealMonthData, monthData] = getData(startYear, startMonth)
      .map((el, i) => ({ [i + 1]: el === "0" ? "workday" : "holyday" }))
      .filter((e, i) => i + 1 >= startDay && i + 1 <= endDay);

    return { issues, idealMonthData, monthData, labels, milestone };
  }
  const [idealMonthData, monthData] = transformData([
    convertData(
      await getData(startYear, startMonth),
      startYear,
      startMonth,
      startDay,
      "start"
    ),
    convertData(
      await getData(endYear, endMonth),
      endYear,
      endMonth,
      endDay,
      "end"
    )
  ]);

  const getIssuesStatistics = async (year, month, day) =>
    fetch(`${apiUrl}/issues_statistics`, {
      method: "POST",
      body: JSON.stringify({ year, month, day })
    }).then(r => r.json());

  const issuesCount = Promise.all(
    monthData
      .filter(
        e =>
          e.day[0] <= currentDay &&
          e.month === currentMonth &&
          e.year === currentYear
      )
      .map(e => getIssuesStatistics(e.year, e.month, e.day[0]))
  ).then(v => v.map(e => issues.length - e.statistics.counts.opened));
  return { issues, idealMonthData, monthData, labels, milestone, issuesCount };
};

(async () => {
  const {
    issues,
    idealMonthData,
    monthData,
    labels,
    issuesCount
  } = await getContent();
  const issuesArr = await issuesCount;

  window.config = {
    issuesLength: issues.length,
    mappedDates: idealMonthData.map(
      (e, i) =>
        issues.length - (issues.length / (idealMonthData.length - 1)) * i
    ),
    days: monthData.map(e => e.day),
    color: labels[0].color,
    issuesArr: issuesArr
  };
})();
const { issuesLength, mappedDates, days, color, issuesArr } = window.config;
document.querySelector("select").addEventListener("change", e => {
  fetch("/update", {
    method: "POST",
    body: JSON.stringify({ label: e.target.value }),
    headers: {
      "Content-Type": "application/json"
    }
  })
    .then(r => r.json())
    .then(r => {
      chart.destroy();
      chart = createChart(r.issuesArr, r.mappedDates, r.issuesLength, r.color);
      chart.data.label = r.label;
      chart.update();
    });
});

const canvas = document.getElementById("myChart");
canvas.width = 1800;
canvas.height = 800;
// Chart.defaults.global.elements.point.pointStyle = 'dash'
let i = 0;
const ctx = canvas.getContext("2d");
Chart.defaults.global.plugins.datalabels.formatter = value => value.y;

function createChart(issuesArr, mappedDates, issuesLength, color) {
  return new Chart(ctx, {
    plugins: [ChartDataLabels],
    type: "line",
    data: {
      datasets: [
        {
          datalabels: {
            align: "top",
            font: {
              size: 20,
              weight: "bold"
            },
            labels: {
              value: {},
              title: {
                // color: 'blue'
              }
            }
          },
          label: "Sprint Burndown",
          data: issuesArr,
          lineTension: 0.2,
          backgroundColor: "rgba(0, 0, 0, 0)",
          borderColor:
            // '#03a9f4'
            color
        },
        {
          datalabels: {
            display: false
          },
          label: "Ideal Burndown",
          data: mappedDates,
          backgroundColor: "rgba(0, 0, 0, 0)",
          borderWidth: 1
        }
      ],
      labels: days
    },

    options: {
      responsive: false,
      animation: {
        easing: "linear"
      },
      scales: {
        yAxes: [
          {
            gridLines: {
              display: false
            },
            ticks: {
              max: issuesLength,
              min: 0
            }
          }
        ],
        xAxes: [
          {
            gridLines: {
              display: false
            }
          }
        ]
      }
    }
  });
}

let chart = createChart([issuesArr], [mappedDates], issuesLength, color);
