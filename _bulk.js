const Papa = require('papaparse')
const fs = require('fs')

const file = fs.readFileSync('./tinyanvil-export.csv')

Papa.parse(file.toString('utf8'), {
  header: true,
  async complete({data}) {
    data = data.map(({id, cipher}) => ({
      key: id,
      value: cipher,
    }))

    fs.writeFileSync('tinyanvil-export.json', JSON.stringify(data, null, 2))
  },
  error(err) {
    console.error(err)
  }
})