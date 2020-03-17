const axios = require("axios");

export const getApiUrl = (year, month) =>
  `https://isdayoff.ru/api/getdata?year=${year}&month=${month}`;

export const getData = async (year, month) => [
  ...(
    await axios({
      url: getApiUrl(year, month),
      transformResponse: [
        function(data) {
          return data;
        }
      ]
    })
  ).data
];

export const convertData = (data, year, month, day, type) =>
  data
    .map((el, i) => ({
      day: [i + 1],
      type: el === "0" ? "workday" : "holyday",
      year,
      month
    }))
    .filter(
      el =>
        el.type === "workday" &&
        (type === "start" ? el.day >= day : el.day <= day)
    );

export const transformData = arr => [
  arr
    .flatMap(e => e)
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
    .arr.reverse(),
  arr.flatMap(e => e).map(e => ({...e, day: e.day[0]}))
];

export const getDates = milestone => ({
  startYear: new Date(milestone.start_date).getUTCFullYear(),
  startDay: new Date(milestone.start_date).getUTCDate(),
  endDay: new Date(milestone.due_date).getUTCDate(),
  startMonth: new Date(milestone.start_date).getUTCMonth() + 1,
  endMonth: new Date(milestone.due_date).getUTCMonth() + 1,
  endYear: new Date(milestone.due_date).getUTCFullYear()
});