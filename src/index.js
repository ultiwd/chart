// Packages
import { Chart } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

// Helpers
import { getDates, getData, convertData, transformData } from "./helpers";
import { modalTemplate } from "./templates";

const apiUrl = process.env.API_URL;
(async () => {
  const getCurrentDay = () => new Date().getDate();

  const getCurrentMonth = () => new Date().getUTCMonth() + 1;

  const getCurrentYear = () => new Date().getUTCFullYear();
  const teamLabels = [
    ...new Set(
      (await fetch(`${apiUrl}/labels`).then(r => r.json()))
        .filter(e => e.name.toLowerCase().includes("team"))
        .map(e => e.name)
    )
  ];
  const obj = {
    teamLabel: "Team Jedi",
    isFullscreen: false,
    isFetching: false
  };

  const validator = {
    set: function(target, key, value) {
      if (key === "isFullscreen") {
        target[key] = value;
        return true;
      }
      if (key === "isFetching") {
        if (value) {
          document.querySelector("#preloader").style.display = "flex";
        } else {
          document.querySelector("#preloader").style.display = "none";
        }
      }
      if (key === "teamLabel") {
        if (document.querySelector("select")) {
          document.querySelector("select").selectedIndex = teamLabels.indexOf(
            value
          );
        }
        target[key] = value;
        return true;
      }
      return true;
    }
  };

  const state = new Proxy(obj, validator);

  const doneIssueLabel = "Done Dev";

  const getContent = async teamLabel => {
    const milestone = await fetch(`${apiUrl}/milestone`).then(r => r.json());

    const issues = await fetch(`${apiUrl}/issues?team=${teamLabel}`).then(r =>
      r.json()
    );

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
          `${apiUrl}/issues_statistics?year=${year}&month=${month}&day=${day}&team=${teamLabel}`
        ).then(r => r.json());
      const issuesCount = Promise.all(
        monthData
          .filter(e => e.day <= getCurrentDay())
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
        `${apiUrl}/issues_statistics?year=${year}&month=${month}&day=${day}&team=${teamLabel}`
      ).then(r => r.json());
    const issuesCount = Promise.all(
      monthData
        .filter(e => {
          return (
            (e.day <= getCurrentDay() &&
              e.month === getCurrentMonth() &&
              e.year === getCurrentYear()) ||
            (e.day >= getCurrentDay() &&
              e.month < getCurrentMonth() &&
              e.year === getCurrentYear())
          );
        })
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
  };

  state.isFetching = true;
  const {
    issues,
    idealMonthData,
    monthData,
    labels,
    issuesCount
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
        legend: {
          display: false
        },
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
  createChart(issuesArr, mappedDates, issuesLength, color);
  document.querySelector(".settings").addEventListener("click", () => {
    document.querySelector(".modal-slot").innerHTML = modalTemplate(
      teamLabels.map(e => ({
        name: e,
        selected: state.teamLabel === e
      })),
      state
    );
    document
      .querySelector("#fullscreen")
      .addEventListener("change", ({ target }) => {
        if (target.checked) {
          document.documentElement.webkitRequestFullScreen();
          state.isFullscreen = true;
        } else {
          document.exitFullscreen();
          state.isFullscreen = false;
        }
      });

    document.querySelector("#team").addEventListener("change", e => {
      state.teamLabel = e.target.value;
      updateChart(e.target.value);
    });
    document
      .querySelector(".modal-close")
      .addEventListener(
        "click",
        () => (document.querySelector(".modal-slot").innerHTML = "")
      );
  });

  const updateChart = async nextTeamLabel => {
    if (state.isFetching) return;
    state.isFetching = true;

    if (!nextTeamLabel) {
      const currentTeamLabelId = teamLabels.indexOf(state.teamLabel);
      const nextTeamLabelId =
        currentTeamLabelId === teamLabels.length - 1
          ? 0
          : currentTeamLabelId + 1;
      state.teamLabel = teamLabels[nextTeamLabelId];
    }
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
    document.querySelector("h1").innerHTML = state.teamLabel;
    state.isFetching = false;
  };

  document.querySelector("h1").innerHTML = state.teamLabel;
  setInterval(updateChart, 100000);
  state.isFetching = false;
})();
