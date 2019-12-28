const getTemplate = (
  issuesLength,
  mappedDates,
  days,
  color,
  issuesArr
) => `
<html>
    <head><ttle>Chart</title></head>
    <body>
    <canvas id="myChart"></canvas>
    <select>
        <option>Team Jedi</option>
        <option>TeamXOR</option>
    </select>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@2.9.3/dist/Chart.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
    <script>

    document.querySelector('select').addEventListener('change', (e) => {
        fetch('/update',{
            method: 'POST',
            body: JSON.stringify({label: e.target.value}),
            headers: {
                'Content-Type': 'application/json'
              },
        }).then(r => r.json()).then(r => {

            chart.destroy()
            chart = createChart(r.issuesArr, r.mappedDates, r.issuesLength, r.color)
            chart.data.label = r.label
            chart.update()
        })
    })

    const canvas = document.getElementById('myChart')
    canvas.width = 1800
    canvas.height = 800
    // Chart.defaults.global.elements.point.pointStyle = 'dash'
    let i = 0
    const ctx = canvas.getContext('2d');
    Chart.defaults.global.plugins.datalabels.formatter = (value) => value.y
    

    function createChart(issuesArr, mappedDates, issuesLength, color) {
        return new Chart(ctx, {
            plugins: [ChartDataLabels],
            type: 'line',
            data: {
                datasets: [{
                    datalabels: {
                        align: 'top',
                        font: {
                            size: 20,
                            weight: 'bold',
                        },
                        labels: {
                            value: {},
                            title: {
                                // color: 'blue'
                            }
                        }
                    },
                    label: 'Sprint Burndown',
                    data: issuesArr,
                    lineTension: 0.2,
                    backgroundColor: 'rgba(0, 0, 0, 0)',
                    borderColor:  
                        // '#03a9f4'
                        color
                },{
                    datalabels: {
                        display: false
                    },
                    label: 'Ideal Burndown',
                    data: mappedDates,
                    backgroundColor: 'rgba(0, 0, 0, 0)' ,
                    borderWidth: 1
                }],
                labels: [${days}]
            },
    
            options: {
                responsive: false,
                animation: {
                    easing: 'linear',
                },    
                scales: {
                    yAxes: [{
                        gridLines: {
                            display:false
                        },
                        ticks: {
                            max: issuesLength,
                            min: 0
                        }
                    }],
                    xAxes: [{
                        gridLines: {
                            display:false
                        }
                    }]
                }
            }
        });        
    }

    let chart = createChart([${issuesArr}], [${mappedDates}], ${issuesLength}, '${color}')


    // setInterval(() => {
    //     fetch('/content').then(r => r.json()).then(r => chart.data.datasets[0].data[chart.data.datasets[0].data.length - 1] = r)
    // }, 10000)

    </script>    
    </body>
</html>
`;

module.exports = getTemplate;
