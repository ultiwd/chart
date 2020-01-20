// Packages
import { Chart } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

// Helpers
import { getDates, getData, convertData, transformData } from "./helpers";
import { modalTemplate } from "./templates";

const apiUrl = "https://damp-reaches-06511.herokuapp.com";

const currentDay = new Date().getDate();

const currentMonth = new Date().getUTCMonth() + 1;

const currentYear = new Date().getUTCFullYear();

const state = {
  teamLabel: "Team Jedi"
};

const doneIssueLabel = "Done Dev";

const getContent = async teamLabel => {
  const milestone = await fetch(`${apiUrl}/milestone`).then(r => r.json());

  const issues = await fetch(`${apiUrl}/issues?team=${teamLabel}`).then(r =>
    r.json()
  );

  const labels = (await fetch(`${apiUrl}/labels`).then(r => r.json())).filter(
    e => e.name === teamLabel
  );

  const teamLabels = (
    await fetch(`${apiUrl}/labels`).then(r => r.json())
  ).filter(e => e.name.toLowerCase().includes("team"));

  const {
    startYear,
    startDay,
    endDay,
    startMonth,
    endMonth,
    endYear
  } = getDates(milestone);
  if (startYear === endYear && startMonth === endMonth) {
    const monthData = (await getData(startYear, startMonth))
      .map((el, i) => ({
        day: i + 1,
        type: el === "0" ? "workday" : "holyday",
        month: startMonth,
        year: startYear
      }))
      .filter(
        el => el.type === "workday" && el.day >= startDay && el.day <= endDay
      );

    const idealMonthData = monthData
      .reduceRight(
        (acc, e, i) => {
          if (acc.countOfThursdays === 0) {
            const { day, month, year } = e;
            if (new Date(`${month}-${day}-${year}`).getDay() === 4) {
              return { ...acc, countOfThursdays: 1, arr: [...acc.arr, e] };
            }
            return acc;
          }
          return { ...acc, arr: [...acc.arr, e] };
        },
        { countOfThursdays: 0, arr: [] }
      )
      .arr.reverse();
    const getIssuesStatistics = async (year, month, day) =>
      fetch(
        `${apiUrl}/issues_statistics?year=${year}&month=${month}&day=${day}&team=${teamLabel}`
      ).then(r => r.json());
    console.log(currentDay);
    const issuesCount = Promise.all(
      monthData
        .filter(e => e.day <= currentDay)
        .map(e => getIssuesStatistics(e.year, e.month, e.day))
    ).then(v => v.map(e => issues.length - e.statistics.counts.opened));
    return {
      issues,
      idealMonthData,
      monthData,
      labels,
      milestone,
      issuesCount,
      teamLabels
    };
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

  const getIssuesStatistics = (year, month, day) =>
    fetch(
      `${apiUrl}/issues_statistics?year=${year}&month=${month}&day=${day}`
    ).then(r => r.json());

  const issuesCount = Promise.all(
    monthData
      .filter(
        e =>
          (e.day <= currentDay &&
            e.month === currentMonth &&
            e.year === currentYear) ||
          e.month > currentMonth ||
          e.year > currentYear
      )
      .map(e => getIssuesStatistics(e.year, e.month, e.day))
  ).then(v => v.map(e => issues.length - e.statistics.counts.opened));
  return {
    issues,
    idealMonthData,
    monthData,
    labels,
    milestone,
    issuesCount,
    teamLabels
  };
};

(async () => {
  const {
    issues,
    idealMonthData,
    monthData,
    labels,
    issuesCount,
    teamLabels
  } = await getContent(state.teamLabel);
  const issuesArr = await issuesCount;

  const issuesLength = issues.length;
  const mappedDates = idealMonthData.map(
    (e, i) => issues.length - (issues.length / (idealMonthData.length - 1)) * i
  );
  const days = monthData.map(e => e.day);
  const color = labels[0].color;

  const canvas = document.querySelector("#myChart");
  const ctx = canvas.getContext("2d");
  Chart.defaults.global.defaultFontColor = "white";
  Chart.defaults.global.plugins.datalabels.formatter = ({ y }) => y;
  const gradientStroke = ctx.createLinearGradient(500, 20, 300, 100);
  gradientStroke.addColorStop(1, "#03edf9");
  ctx.shadowColor = "#03edf9";
  ctx.shadowBlur = 15;

  const gradientFill = ctx.createLinearGradient(-50, 0, 10, 0);

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
                size: 35,
                weight: "bold",
                color: "#fc28a8"
              },
              labels: {
                value: {},
                fontColor: "#fc28a8",
                title: {
                  // color: 'blue'
                }
              }
            },
            label: "Sprint Burndown",
            data: issuesArr,
            lineTension: 0.2,
            pointBackgroundColor: "#fff",
            pointBorderWidth: 10,
            borderColor: "#fc28a8",
            borderWidth: 7
          },
          {
            datalabels: {
              display: false
            },
            label: "Ideal Burndown",
            data: mappedDates,
            borderColor: gradientStroke,
            pointBorderColor: "#03edf9",
            pointBackgroundColor: "#fff",
            pointBorderWidth: 10,
            fill: true,
            backgroundColor: gradientFill,
            borderWidth: 7,
            fontColor: "black"
          }
        ],
        labels: days
      },

      options: {
        layout: {
          padding: {
            top: 50,
            bottom: 0
          }
        },
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
  const chart = createChart(issuesArr, mappedDates, issuesLength, color);
  window.chart = chart;

  document.querySelector(".settings").addEventListener("click", () => {
    document.querySelector(".modal-slot").innerHTML = modalTemplate(
      teamLabels.map(e => ({name:e.name, selected: state.teamLabel === e.name }))
    );
    document
      .querySelector("#fullscreen")
      .addEventListener("change", ({ target }) => {
        console.log(target);
        target.checked
          ? document.documentElement.webkitRequestFullScreen()
          : document.exitFullscreen();
      });

    document.querySelector("#team").addEventListener("change", e => {
      state.teamLabel = e.target.value;
      updateChart().then(
        () => (document.querySelector("h1").innerHTML = state.teamLabel)
      );
    });
    document
      .querySelector(".modal-close")
      .addEventListener(
        "click",
        () => (document.querySelector(".modal-slot").innerHTML = "")
      );
  });

  const updateChart = async () => {
    const { issues, idealMonthData, labels, issuesCount } = await getContent(
      state.teamLabel
    );
    const newIssuesArr = await issuesCount;

    const issuesLength = issues.length;
    const mappedDates = idealMonthData.map(
      (e, i) =>
        issues.length - (issues.length / (idealMonthData.length - 1)) * i
    );
    const color = labels[0].color;

    createChart(newIssuesArr, mappedDates, issuesLength, color);
  };

  document.querySelector("h1").innerHTML = state.teamLabel;
  setInterval(updateChart, 1000000);
})();
