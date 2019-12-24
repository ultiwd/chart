// Packages
const Gitlab = require("gitlab").Gitlab;
// const fs = require("fs");
// const db = require("./db");

// Modules
// const getTemplate = require("./template.js");
const { token, host } = require("./config.js");

// Helpers
import {
  getDates,
  getData,
  convertData,
  transformData
} from './helpers'

const api = new Gitlab({
  host,
  token
});

const currentDay = new Date().getUTCDate();
const currentMonth = new Date().getUTCMonth() + 1;

const currentYear = new Date().getUTCFullYear();

let teamLabel = "Team Jedi";

const setLabel = label => {
  teamLabel = label;
};

const doneIssueLabel = "Done Dev";

const getContent = async () => {
  const response = await api.ProjectMilestones.all(50, {
    perPage: 1,
    maxPages: 1,
    state: "active",
  });

  const issues = await api.Issues.all({
    projectId: 50,
    milestone: milestone.title,
    state: "opened",
    labels: teamLabel
  });

  const labels = (await api.Labels.all(50)).filter(e => e.name === teamLabel);

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

  const issuesCount = Promise.all(
    monthData
      .filter(
        e =>
          e.day[0] <= currentDay &&
          e.month === currentMonth &&
          e.year === currentYear
      )
      .map((e, i, arr) =>
        api.IssuesStatistics.all({
          projectId: 50,
          groupId: 17,
          state: "opened",
          updated_before: new Date(
            `${e.year} ${e.month} ${e.day[0]} 10:00`
          ).toISOString(),
          labels: "Done Dev, Team Jedi"
        })
      )
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
