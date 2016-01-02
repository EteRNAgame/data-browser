// global setTimeout timers to reduce event handling overlapping fire
var timer_center_resize = 0;

// draw horizontal borders every 5 rows; called on each draw()
function drawBlockBorder() {
    $("#center-table > tbody > tr").each(function(index) {
        if (index % 5 == 4) {
            $(this).addClass("block_border");
        } else {
            $(this).removeClass("block_border");
        }
    });
}

// coloring of row upon rendering
function rowMetaDecorate() {
    // for when first table init, variable "table" not assigned yet
    if (typeof table === 'undefined') { table = $("#center-table").DataTable(); }

    // color groups according to each "master" of the group
    var masters = table.columns(".master")[0];
    for (var i = 0; i < masters.length; i++) {
        var idx = table.colReorder.order()[masters[i]];
        $("#center-table > tbody > tr").each(function() {
            var d = $(".td_def_" + idx, this).text();
            // naive conditional coloring
            if (d == "Yes" || parseInt(d) > 0) {
                $("td.to-be-colored-" + idx, this).addClass("green-font").removeClass("gray-font");
            } else {
                $("td.to-be-colored-" + idx, this).addClass("gray-font").removeClass("green-font");
            }
        });
    }

    // calculate percentage for each group
    for (var i = 0; i < col_groups.length; i++) {
        // get members of group and sum
        var group = table.columns(".group-percentage-" + col_groups[i])[0];
        // bug that when member of column group is hidden, jQuery can't get that element, result in NaN
        $("#center-table > tbody > tr").each(function() {
            var sum = 0;
            for (var j = 0; j < group.length; j++) {
                var idx = table.colReorder.order()[group[j]];
                sum += parseFloat($(".td_def_" + idx, this).text());
            }
            // append (%) to column
            $("td.group-percentage-" + col_groups[i], this).each(function(j) {
                var idx = table.colReorder.order()[group[j]];
                var val = parseFloat($(this).text());
                var percent = '<span style="display:table; margin:auto;">' + val + ' <i style="color:#888;">(' + Math.round(val / sum * 100).toString() + '%)</i></span>';
                $(this).html(percent);
            });
        });
    }
}

// draw sequence ruler in <th> every 5 residues; called once on init()
function drawSeqRuler() {
    var html = '';
    // make it divisible by 5
    max_len += 5 - max_len % 5;
    for (var i = 1; i <= max_len; i++) {
        if (i == 5) {
            html += '<span class="monospace">5</span>';
        } else if (i <= 95 && i > 5) {
            // cases of two digits
            if (i % 5 == 4) {
                html += '<span class="monospace">' + Math.round(i/10) + '</span>';
            } else if (i % 5 == 0) {
                html += '<span class="monospace">' + Math.round(i % 10) + '</span>';
            } else {
                html += '<span class="monospace">&nbsp;</span>';
            }
        } else if (i > 95) {
            // cases of three digits
            if (i % 5 == 3) {
                html += '<span class="monospace">' + Math.round(i/100) + '</span>';
            } else if (i % 5 == 4) {
                html += '<span class="monospace">' + Math.round(i/10 - 10) + '</span>';
            } else if (i % 5 == 0) {
                html += '<span class="monospace">' + Math.round(i % 10) + '</span>';
            } else {
                html += '<span class="monospace">&nbsp;</span>';
            }
        } else {
            html += '<span class="monospace">&nbsp;</span>';
        }
    }
    $("#seq_number").html(html);
}

// generate column <th> based on meta data; called once on init()
function drawColHeaders(col_header) {
    var html_1 = "<tr>", html_2 = "<tr>";
    // for field names of two words, wrap it into two lines
    for (var i = 0; i < n_fields; i++) {
        var col = col_header[i][0];
        if (col.indexOf(" ") != -1 && col.toLowerCase() != "sequence") {
            html_1 += '<th class="th_def_' + i + '">' + col.substring(0, col.indexOf(" ")) + '</th>';
            html_2 += '<th>' + col.substring(col.indexOf(" ") + 1, col.length) + '</th>';
        } else  if (col.toLowerCase() == "sequence") {
            html_1 += '<th class="th_def_' + i + '">Sequence</th>';
            html_2 += '<th id="seq_number"></th>';
        } else {
            html_1 += '<th class="th_def_' + i + '"></th>';
            html_2 += "<th>" + col + "</th>";
        }
    }
    $("#table-thead").html(html_1 + "</tr>" + html_2 + "</tr>");
}

// correct data types based on header meta; currently not called
function convertTypes(col_header) {
	for (var i = 0; i < synthesized.length; i++) {
		for (var j = 0; j < synthesized[i].length; j++) {
			if (col_header[j][1] != "string" && typeof(synthesized[i][j]) != col_header[j][1]) {
				synthesized[i][j] = Number(synthesized[i][j]);
			}
		}
	}
}

// extract numeric data from <td> element
// because when sort(), DataTables takes the html() content regardless of original data source
function extractNumCell(d) {
    // get pure trimmed text()
    d = $("<p>" + d + "</p>").text().trim();
    // get substring before e.g. "/100" and "(%)"
    if (d.indexOf("/") != -1) { d = d.substring(0, d.indexOf("/")); }
    if (d.indexOf("(") != -1) { d = d.substring(0, d.indexOf("(")); }
    // only save numbers
    d = d.match("^[-+]?[0-9]*\.?[0-9]+");
    return Number(d);
}

// assign className and type to each column
function initColClass() {
    // custom sorting function for numbers, stripping suffix text
    // "xxx-pre" is recognizied for "xxx" in column.type
    $.fn.dataTable.ext.type.order["num-filtered-pre"] = function ( d ) { return extractNumCell(d); };

	var obj = [];
	for (var i = 0; i < n_fields; i++) {
		var col_type = col_header[i][1];
        // internally reference columns as td_def_*, 0-indexed
        var class_name = "td_def_" + i;
        // add to-be-colored group class name
        if (col_header[i].length > 3 && col_header[i][3]) {
            if (isNaN(parseInt(col_header[i][3]))) {
                class_name += ' ' + col_header[i][3];
            } else {
                class_name += ' to-be-colored-' + col_header[i][3];
                if (col_header[i][3] == i) { class_name += ' master'; }
            }
        }
        // add group-percentage- group class name
        if (col_header[i].length > 4 && col_header[i][4]) {
            class_name += ' group-percentage-' + col_header[i][4];
        }

        // format for numeric columns
        if (col_type == "int" || col_type == "float") {
            obj.push({"className": class_name, "type": "num-filtered"});
        } else {
            obj.push({"className": class_name, "type": "string"});
        }            
	}
	return obj;
}

// assign columnDefs of coloring and suffix etc.
function initColRender() {
    var obj = [];
    for (var i = 0; i < n_fields; i++) {
        var col_type = col_header[i][1];

        // special rendering for "Sequence" column (nucleotide coloring)
        if (col_header[i].length > 3 && col_header[i][3] == "sequence") {
            obj.push({
                "targets": "th_def_" + i, 
                "render": function(data, type, row, meta) {
                    var html = '';
                    for (var i = 0; i < data.length; i++) {
                        var nt = data.substring(i, i+1);
                        if ((i + 1) % 5 == 0) {
                            html += '<span class="monospace nt-' + nt.toUpperCase() + ' line-per-five-base">' + nt + '</span>';
                        } else {
                            html += '<span class="monospace nt-' + nt.toUpperCase() + '">' + nt + '</span>';
                        }
                    }
                    // get max_len of all sequences, used for <th> ruler
                    if (data.length > max_len) { max_len = data.length; }
                    return html;
                } 
            });
        } else {
            // format for numeric columns
            if (col_type == "int" || col_type == "float") {
                obj.push({
                    "targets": "th_def_" + i, 
                    "render": function(data, type, row, meta) {
                        // for when first table init, variable "table" not assigned yet
                        if(typeof table === 'undefined') { table = $("#center-table").DataTable(); };

                        var idx = meta['col'];
                        idx = table.colReorder.order()[idx];
                        // round float to 2 decimals
                        if (col_header[idx][1] == 'float') {
                            data = parseFloat(data).toFixed(2);
                        } else {
                            data = parseInt(data);
                        }
                        // add suffix string in gray if exists
                        var suffix = '';
                        if (col_header[idx].length > 2 && col_header[idx][2].length) {
                            suffix = ' <i style="color:#888;">' + col_header[idx][2] + '</i>';
                        }
                        return '<span class="td-num">' + data + suffix + '&nbsp;&nbsp;</span>';
                    } 
                });
            } else {
                obj.push({
                    "targets": "th_def_" + i, 
                    "render": function(data, type, row, meta) {
                        // for when first table init, variable "table" not assigned yet
                        if(typeof table === 'undefined') { table = $("#center-table").DataTable(); };

                        var idx = meta['col'];
                        idx = table.colReorder.order()[idx];
                        var suffix = '';
                        if (col_header[idx].length > 2 && col_header[idx][2].length) {
                            suffix = ' <i style="color:#888;">' + col_header[idx][2] + '</i>';
                        }
                        // truncate text and enable expand-when-hover, controlled by CSS
                        return '<p class="txt-hover">' + data + suffix + '</p>';
                    } 
                });
            }            
        }

    }
    return obj;
}

// main function for drawing the DataTable
function initTable() {
    $("#center-table").DataTable({
        "data": synthesized,
        "dom": 'BRC<"clear">rt',
        "processing": true,
        "sortCellsTop": true,
        "stateSave": true,
        "orderClasses": true,
        // "bPaginate": false,
        "scrollX": "100%",
        "scrollY": $(window).height() - 245,
        "sortClasses": false,
        "autoWidth": true,
        "deferRender": true,
        "scroller": {
            "loadingIndicator": true,
            "displayBuffer": 2,
        },

        "columns": initColClass(),
        "columnDefs": initColRender(),

        "select": {
            "style": "os",
            "items": "row",
            "selector": "td" // does not work at all!
        },
        // custom buttons above the table
        "buttons": [
            {
                "extend": "selectNone",
                "text": "Unselect Rows",
                "className": "purple-button seq-button table-button"
            },
            {
                "text": "Labs",
                "action": function ( e, dt, node, config ) {
                    if (pageLayout.state.west.isClosed) {
                        pageLayout.toggle("west");
                        $("#tab-panel-west-1").trigger("click");
                    } else {
                        if ($("#tab-panel-west-1").parent().attr("aria-selected") == "true") {
                            pageLayout.toggle("west");
                        } else {
                            $("#tab-panel-west-1").trigger("click");
                        }
                    }
                },
                "className": "green-button seq-button table-button"
            },
            {
                "text": "Columns",
                "action": function ( e, dt, node, config ) {
                    if (pageLayout.state.west.isClosed) {
                        pageLayout.toggle("west");
                        $("#tab-panel-west-2").trigger("click");
                    } else {
                        if ($("#tab-panel-west-2").parent().attr("aria-selected") == "true") {
                            pageLayout.toggle("west");
                        } else {
                            $("#tab-panel-west-2").trigger("click");
                        }
                    }
                },
                "className": "green-button seq-button table-button"
            },
            {
                "text": "Display",
                "action": function ( e, dt, node, config ) {
                    if (pageLayout.state.west.isClosed) {
                        pageLayout.toggle("west");
                        $("#tab-panel-west-3").trigger("click");
                    } else {
                        if ($("#tab-panel-west-3").parent().attr("aria-selected") == "true") {
                            pageLayout.toggle("west");
                        } else {
                            $("#tab-panel-west-3").trigger("click");
                        }
                    }
                },
                "className": "green-button seq-button table-button"
            },
            {
                "text": "Download",
                "action": function ( e, dt, node, config ) {
                    alert("Data download is not implemented yet.")
                    // window.open("/data/synthesis" + id + ".tsv", "Download");
                },
                "className": "blue-button seq-button table-button"
            },
        ],

        "initComplete": function() { 
            // draw sequence numbering once on init
            drawSeqRuler();
            // remove "Loading" placeholder
            $(".ui-layout-center > h1").remove();
        },
        "drawCallback": function() { 
            // draw horizontal separators every 5 rows
            drawBlockBorder();
            rowMetaDecorate();
            // work around for select trigger, re-route click events to 1st column
            $("td").on("click", function(e) {
                if (!$(this).hasClass("td_def_0")) {
                    var td_0 = $(this).parent().find(".td_def_0");
                    // replacing the "target" is important!
                    e["target"] = td_0[0];
                    td_0.trigger(e);
                    e.stopPropagation();
                }
            })
        },
        // not used because it fires for each row, too frequent
        "rowCallback": function(row, data, dataIndex) {}
    });

    // init side panels
    initStr2D();
    initColOpt();
    initFilterInput();
    // move buttons to same line with lab title
    table.buttons().container().prependTo($("#button-container"));
    $(".dt-buttons").removeClass("dt-buttons");


    // slide-out effect of panels on init()
    pageLayout.close("south");
    pageLayout.close("west");
    pageLayout.close("east");
    // make sure table size and 2D JS size are right
    $(window).on("resize", function() { resizeCenterTable(); });
}

// handle table height resizeTimer
function resizeCenterTable() {
    clearTimeout(timer_center_resize);
    timer_center_resize = setTimeout(function() {
        if (DEBUG) { console.log("center-resize"); }
        $("div.dataTables_scrollBody").css("height", $("#concept-center").height() - $("#lab-red-header").height() - $("div.dataTables_scrollHead").height() - 40);
        table.draw();
    }, 100);
}
