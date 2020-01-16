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
  const milestone = await fetch(`${apiUrl}/milestone`).then(r => r.json());

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
        `${apiUrl}/issues_statistics?year=${year}&month=${month}&day=${day}`
      ).then(r => r.json());
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
      issuesCount
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
          e.month > currentMonth || e.year > currentYear
      )
      .map(e => getIssuesStatistics(e.year, e.month, e.day))
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

  const config = {
    issuesLength: issues.length,
    mappedDates: idealMonthData.map(
      (e, i) =>
        issues.length - (issues.length / (idealMonthData.length - 1)) * i
    ),
    days: monthData.map(e => e.day),
    color: labels[0].color,
    issuesArr: issuesArr
  };

  const { issuesLength, mappedDates, days, color } = config;
  const canvas = document.getElementById("myChart");
  canvas.width = 1800;
  canvas.height = 800;
  const ctx = canvas.getContext("2d");
  Chart.defaults.global.defaultFontColor = "white";
  Chart.defaults.global.plugins.datalabels.formatter = value => value.y;
  const gradientStroke = ctx.createLinearGradient(500, 20, 300, 100);
  // gradientStroke.addColorStop(0, '#fc28a8');
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
  document
    .querySelector("h1")
    .addEventListener("click", () =>
      document.documentElement.webkitRequestFullScreen()
    );
  setInterval(async () => {
    const { issues, idealMonthData, labels, issuesCount } = await getContent();
    const newIssuesArr = await issuesCount;
    const config = {
      issuesLength: issues.length,
      mappedDates: idealMonthData.map(
        (e, i) =>
          issues.length - (issues.length / (idealMonthData.length - 1)) * i
      ),
      color: labels[0].color
    };

    const { issuesLength, mappedDates, color } = config;

    window.chart.destroy();
    window.chart = createChart(newIssuesArr, mappedDates, issuesLength, color);
    window.chart.update();
  }, 1000000);
})();
