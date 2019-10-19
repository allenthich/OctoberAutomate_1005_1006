// REMINDER: RUN CMD: export NODE_OPTIONS=--max_old_space_size=4096 OTHERWISE
var jsdom = require("jsdom");
const { JSDOM } = jsdom;
var dom = new JSDOM('');

var $ = require('jquery')(dom.window)
var filenames = require('../s1Filenames.js')

var Promise = require('promise')
var fs = require('fs');
var path = require('path');
var XLSX = require('xlsx');
var startTime = Date.now()
var main = {}
var hasTable = []
var noTable = []

/* create new workbook */
var workbook = XLSX.utils.book_new();
var ws = XLSX.utils.aoa_to_sheet([
    ["ID", "FullName", "Age", "Title", "Director", "Executive", "Chairman", "CEO", "CFO"]
]);

main.exportHtmlTable = function (filename, htmlTableElement) {
    var workbook = XLSX.utils.table_to_book(htmlTableElement);
    XLSX.writeFile(ws, 'results.xlsx');
}

main.processHtmlFile = function (filename) {
    return new Promise((resolve, reject) => {
        console.log('=====================================')
        console.log('PROCESSING FILE...', filename)
        var filePath = path.join(__dirname, "../S1_Files/" + filename)
        var stats = fs.statSync(filePath)
        // var fileSizeInBytes = (stats["size"] / 2)
        // console.log('filesize: ', fileSizeInBytes)
        var htmlString = ''

        function streamFile () {
            console.log('START STREAMING...')
            return new Promise((resolve, reject) => {
                const stream = fs.createReadStream(filePath, {
                    encoding: 'UTF-8'
                })
                stream.on('data',function(data){
                    // console.log('STREAMING...')
                    htmlString += data
                    if (/(<HTML>)/i.test(htmlString) && /(<\/HTML>)/i.test(htmlString)) {
                        console.log('CLOSING STREAM')
                        stream.close()
                        resolve()
                    }
                });
                  
                stream.on('end', function () {
                    console.log('STREAM CLOSED')
                    stream.close()
                    resolve()
                })
            })
        }
        streamFile().then((err) => {
            console.log('PROCESSED FILE...', filename)
            if (err) {
                throw err; 
            }
            var workbookArray = []

            // Sanitize HTML file to String
            var uncleanHtmlStr = htmlString.toString().trim()
            var startIndex = uncleanHtmlStr.indexOf('<HTML>')
            var endIndex = uncleanHtmlStr.lastIndexOf('</HTML>')
            var cleanHtmlStr = uncleanHtmlStr.substring(startIndex, endIndex)
            
            // Create jQuery document
            var secondDom = new JSDOM(cleanHtmlStr);
            var second$ = require('jquery')(secondDom.window)
            second$.expr[":"].contains = second$.expr.createPseudo(function(arg) {
                return function( elem ) {
                    return second$(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
                };
            });
            
            // Given raw table html element, return array of arrays
            function getTableData () {
                console.log('GETTING TABLE DATA')
                return new Promise((resolve, reject) => {
                    try {
                        console.log("SELECTING ROWS")
                        var $trows = second$(second$("table:contains('Name'):contains('Age'):contains('Position'), table:contains('Name'):contains('Age'):contains('Title')").get(0)).children().children()
                        var numRows = $trows.length
                        // console.log('ROWS: ', numRows)
                        $trows.each(function(trIndex) {
                            // console.log('ROW: ', trIndex,'/', numRows)
                            var row = []
                            var titleFlags = ['', '', '', '', '']
                            var $tr = $(this).children('td')
                            $tr.each(function(i){
                                var data = $(this).text().trim();
                                // BAD ROW
                                if ((/^(Name|Age|Position|Position(\s?)\(s\)|Directors(:?)|Title|Executive Officers(:?)|Executive Officers and Senior Management|Executive Officers and Directors|Directors and Executive Officers|Executive Officers and Directors:|•|Non-Employee Directors|Non-management directors:|Current Directors:|Management of Digital Domain Media Group, Inc.|Management of Digital Domain|Other Directors(:?)|Current Executive Officers:|Prospective Directors:|Significant Employees|Proposed Director:|Other key employees:|Executive Officers (other than Mr. Walbert)|Other Directors:|Other Executive Management|Board of Directors:|Listed in alphabetical order:|Other Executive Officers and Key Employees:|Executive Officers and Key Employees|Key Employee(s?)(:?))$/i.test(data))) {
                                    return false
                                }
                                if (data) {
                                    try {
                                        var sortedIndices = [
                                            data.indexOf('*'),
                                            data.indexOf(', Esq'),
                                            data.indexOf(', CPA'),
                                            data.indexOf(', Sc.D.( )'),
                                            data.indexOf(', Sc.D.'),
                                            data.indexOf(', J.D.'),
                                            data.indexOf(', M.Sc.'),
                                            data.indexOf(', MD'),
                                            data.indexOf(', DVM'),
                                            data.indexOf(', PhD'),
                                            data.indexOf(', MS'),
                                            data.indexOf(', M.D.'),
                                            data.indexOf(', M.D.'),
                                            data.indexOf(', Ph.D.'),
                                            data.indexOf(', Ph.D.'),
                                            data.indexOf(', Pharm. D'),
                                            data.indexOf('( )'),
                                            data.indexOf('(1)'),
                                            data.indexOf('(2)'),
                                            data.indexOf('(3)'),
                                            data.indexOf('(4)'),
                                            data.indexOf('(5)'),
                                            data.indexOf('(6)'),
                                        ].sort(function(a, b){return a - b})
                                        
                                        var minIndex = -1
                                        for (var j = 0; j < sortedIndices.length; j ++) {
                                            if (sortedIndices[j] != -1) {
                                                minIndex = sortedIndices[j]
                                                break
                                            }               
                                        }
                                        if (minIndex != -1) {
                                            data = data.substring(0, minIndex)
                                        }
                                        // console.log('DATA', data)
                                        data = data.trim()
                                    } catch(err) {
                                        console.error('ERROR: ', err)
                                    }
    
                                    if (/(Director)|(Board of Directors)/i.test(data)) titleFlags[0] = '1'
                                    if (/(Executive)|(Vice President)/i.test(data)) titleFlags[1] = '1'
                                    if (/(Chairman)/i.test(data)) titleFlags[2] = '1'
                                    if (/(Chief Executive Officer)/i.test(data)) titleFlags[3] = '1'
                                    if (/(Chief Financial Officer)/i.test(data)) titleFlags[4] = '1'
                                    row.push(data)
                                }
                                // Final col
                                if (i + 1 == $tr.length && row.length > 0) {
                                    if (titleFlags.join('') == '') {
                                        titleFlags[1] = '1'
                                    }
                                    var final = [].concat(filename.split('.')[0], row, titleFlags)
                                    // console.log('ROW: ', final)
                                    workbookArray.push(final)
                                }
                            })
                            // Final row
                            if (trIndex + 1 == $trows.length) {
                                resolve()
                            }
                        });
                        if (!$trows.length) {
                            console.log('ERROR: NONE SELECTED')
                            resolve()
                        }
                    } catch (err) {
                        console.log('ERROR: SELECTOR')
                    }
                })
            }
            // Table exists in HTML
            if (second$("table:contains('Name'):contains('Age'):contains('Position'), table:contains('Name'):contains('Age'):contains('Title')").length) {
                console.log('TABLE EXISTS IN HTML')
                getTableData().then(() => {
                    XLSX.utils.sheet_add_aoa(ws, workbookArray, {origin:-1});
                    secondDom = undefined
                    resolve()
                })
                hasTable.push(filename)
            } else {
                console.log('TABLE DOES NOT EXIST IN HTML')
                noTable.push(filename)
                resolve()
            }
        })
    })
}

main.getHTML = function () {
    return new Promise((resolve, reject) => {
        filenames.reduce(function(p, filename) {
            return p.then(function() {
                // console.log(filename)
                return main.processHtmlFile(filename)
            });
        }, Promise.resolve()).then(function() {
            var timeElasped = (Date.now() - startTime) / 1000
            console.log('TIME ELAPSED: ', timeElasped, 's')
            console.log('EXPORTING')
            
            var processed_ws = XLSX.utils.aoa_to_sheet([["PROCESSED"]]);
            var unprocessed_ws = XLSX.utils.aoa_to_sheet([["UNPROCESSED"]]);
            
            XLSX.utils.sheet_add_aoa(processed_ws, [hasTable], {origin:-1});
            XLSX.utils.sheet_add_aoa(unprocessed_ws, [noTable], {origin:-1});
            XLSX.utils.book_append_sheet(workbook, ws, 'DATA');
            XLSX.utils.book_append_sheet(workbook, processed_ws, "PROCESSED_META");
            XLSX.utils.book_append_sheet(workbook, unprocessed_ws, "UNPROCESSED_META");
            
            XLSX.writeFile(workbook, 'results.xlsx');
            resolve()
        });
    })
}

module.exports = main;