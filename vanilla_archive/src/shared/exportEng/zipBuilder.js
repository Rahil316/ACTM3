/**
 * exportEng/zipBuilder.js
 * UI thread only — requires JSZip to be loaded first.
 * Receives a files[] from the Figma sandbox and downloads a ZIP.
 */

function buildAndDownloadZip(projectName, files) {
  if (typeof JSZip === "undefined") {
    BannerManager.error("ZIP library not loaded — please reload the plugin.");
    return;
  }
  var zip = new JSZip();
  var folderSlug = (projectName || "token-wand")
    .toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  var root = zip.folder(folderSlug);

  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    var parts = f.path.split("/");
    var fileName = parts.pop();
    var dir = root;
    for (var j = 0; j < parts.length; j++) {
      dir = dir.folder(parts[j]);
    }
    dir.file(fileName, f.content);
  }

  zip.generateAsync({ type: "blob" }).then(function(blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = folderSlug + "-tokens.zip";
    a.click();
    URL.revokeObjectURL(url);
  });
}
