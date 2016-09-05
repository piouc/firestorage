const fs = require('fs')
const path = require('path')

const request = require('request')
const mime = require('mime-types')
const Gauge = require('gauge')


function upload(filePath, callback){
	request('http://firestorage.jp/flashuptest.cgi?act=flashupjs&type=flash10b&photo=1&talk=1&json=1&eid=', (err, res, body) => {
		if(err){
			callback(err)
			return
		}

		const data = JSON.parse(body)
		const pass = randomStrings(10)
		const fileName = path.parse(filePath).base
		const fileSize = fs.statSync(filePath).size
		const fileStream = fs.createReadStream(filePath)

		const req = request({
			method: 'POST',
			url: data.upload,
			formData: {
				folder_id: data.folder_id,
				ppass: pass,
				jqueryupload: '1',
				processid: data.processid,
				Filename: {
					value: fileStream,
					options: {
						filename: fileName,
						contentType: mime.lookup(fileName)
					}
				}
			}
		}, (err, res, body) => {
			if(err){
				callback(err)
				return
			}
			const url = decodeURIComponent(body).match(/http:\/\/firestorage.jp\/download\/[0-9a-f]{40}/)[0]
			callback(null, url, pass)
		})

		const gauge = new Gauge(fileStream)
		const intervalID = setInterval(() => gauge.pulse(), 100)

		fileStream.on('data', () => {
			const progress = fileStream.bytesRead / fileSize
			const percent = Math.floor(progress * 100)
			gauge.show(`Uploading ${fileName} | ${percent}% ${fileStream.bytesRead}/${fileSize}bytes`, progress)
		}).on('end', () => {
			clearInterval(intervalID)
			gauge.hide()
		})
	})
}


function randomStrings(length){
	const source = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
	return [...Array(length)].map(() => source[Math.random() * source.length | 0]).join('')
}


module.exports = upload