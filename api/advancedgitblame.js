const shell = require('shelljs')
var BlameJS = require("blamejs")
const fg = require('fast-glob')
const minimatch = require('minimatch')
// const Queue = require('bull')
const fs = require('fs');
const hash = require('object-hash')

function fileExcluded(filepath, ignores) {
  for (let i = 0; i < ignores.length; i++) {
    const ignorePattern = ignores[i]
    if (filepath.includes("/.git") || minimatch(filepath, ignorePattern, { matchBase: true })) {
      return true
    }
  }
  return false
}

function extractFiles (file, ignores) {
  if (file["children"].length === 0) {
    if (fileExcluded(file.path, ignores)) {
      return []
    }
    return [file.path]
  } else {
    let files = [];
    file.children.forEach((child) => {
      files = files.concat(extractFiles(child, ignores));
    })
    return files
  }
}

function createNode (path, tree, fullpath, repo, currentPath = null) {
  const name = path.shift()
  const idx = tree.findIndex(function (e) {
    return e.name == name
  })
  if (currentPath === null) {
    currentPath = `${repo}/${name}`
  } else {
    currentPath += `/${name}`
  }
  if (idx < 0) {
    if (name) {
      tree.push({
        name,
        children: [],
        path: currentPath,
        repo
      })
    }
    if (path.length !== 0) {
      if (name) {
        createNode(path, tree[tree.length - 1].children, fullpath, repo, currentPath)
      }
    }
  } else if (name) {
    createNode(path, tree[idx].children, fullpath, repo, currentPath)
  }
}

function parse (data, repo) {
  const tree = []
  for (let i = 0; i < data.length; i++) {
    const path = data[i]
    const split = path.replace(repo, '').split('/').filter(x => x !== '')
    createNode(split, tree, path, repo)
  }
  return tree
}

export default async function (req, res, _) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  if (url.searchParams.get('repopath') == null) {
    res.end()
    return
  }

  // const chartQueue = new Queue('gitblame-queue', 'redis://127.0.0.1:6379');
  // console.log('chartQueue', chartQueue);

  // chartQueue.process(async function (job, done) {
  //   // let writer = fs.createWriteStream(`analyses/${jobHash}`) 
  
  //   let repopath = job.data.repopath
  //   let ignores = job.data.ignores
  //   let files = [];
  //   var jobHash = hash(job.data)
  //   const fromDate = new Date(job.data.fromDate).getTime() / 1000 

  //   const result = await fg([repopath + '/**/*'], { dot: true })
  //   const repotree = parse(result, repopath)
  //   repotree.forEach((file) => {
  //     files = files.concat(extractFiles(file, ignores))
  //   });
  //   // fs.writeFile(`analyses/${jobHash}`, JSON.stringify({analysis: '{}', progress: 0}), (err) => {
  //   //   if (err) {
  //   //     console.log(err)
  //   //   }
  //   // });
  //   console.log('files.length', files.length);
 
  //   let authors = new Map();
  //   var step = (files.length - files.length % 10) / 10;

  //   for (let i = 0; i < files.length; i++) {
  //     let file = files[i]
  //     let dirpath = file.split('/');
  //     const filename = dirpath.pop();
  //     dirpath = dirpath.join('/');
  //     let ext = filename.split('.').pop()

  //     var requestBlame = `cd ${dirpath} && git blame ${filename} -p`
  //     const gitblame = shell.exec(requestBlame, { silent: true }).stdout;
  //     const blamejs = new BlameJS();  
  //     blamejs.parseBlame(gitblame);
  //     var commitData = blamejs.getCommitData();
  //     var lineData = blamejs.getLineData();

  //     for (let ind in lineData) {
  //       let author = commitData[lineData[ind].hash]["authorMail"];
  //       let newLine = job.data.fromDate ? commitData[lineData[ind].hash]["authorTime"] >= fromDate ? 1 : 0 : 1;
  //       // newLines += newLine
  //       if (newLine == 1) {
  //         var time = new Date(commitData[lineData[ind].hash]["authorTime"] * 1000);
  
  //         var theyear = time.getFullYear();
  //         var themonth = time.getMonth() + 1;
  //         var thetoday = time.getDate();
  //         console.log(`${author} || ${file} || ${ind} || ${theyear + "/" + themonth + "/" + thetoday}`)
  //       }

  //       if (authors.get(author)) {
  //         if (authors.get(author).get(ext)) {
  //             authors.get(author).set(ext, authors.get(author).get(ext) + newLine)
  //         } else {
  //             authors.get(author).set(ext, newLine)
  //         }
  //         authors.get(author).set('.all', authors.get(author).get('.all') + newLine)
  //       } else {
  //         let newAuthor = new Map()
  //         newAuthor.set(ext, newLine)
  //         newAuthor.set('.all', newLine)
  //         authors.set(author, newAuthor)
  //       }
  //     }

  //     if (i % step == 0 && 0 < (i / step)  && (i / step) < 10) {
  //       let intermediateAuthors = new Map()
  //       for (let author of authors.keys()) {
  //         intermediateAuthors.set(author, Object.fromEntries(authors.get(author).entries()))
  //       }
  //       let intermediate = JSON.stringify(Object.fromEntries(intermediateAuthors.entries()));
        
  //       var interProgress = 10 * (i / step)
  //       // fs.rm(`analyses/process_${interProgress - 10}_${jobHash}`)
  //       if (interProgress !== 10) {
  //         fs.unlink(`analyses/process_${interProgress - 10}_${jobHash}`, (err) => {
  //           if (err) throw err;
  //           // console.log('path/file.txt was deleted');
  //         });
  //       }

  //       fs.writeFileSync(`analyses/process_${interProgress}_${jobHash}`, JSON.stringify({analysis: intermediate, progress: interProgress}));
  //     }
  //   }

  //   let resultAuthors = new Map()
  //   for (let author of authors.keys()) {
  //     resultAuthors.set(author, Object.fromEntries(authors.get(author).entries()))
  //   }
  //   let resultOutput = JSON.stringify(Object.fromEntries(resultAuthors.entries()));
  //   fs.writeFileSync(`analyses/process_100_${jobHash}`, JSON.stringify({analysis: resultOutput, progress: 100, status: 'success'}));

  //   fs.unlink(`analyses/process_90_${jobHash}`, (err) => {
  //     if (err) throw err;
  //     // console.log('path/file.txt was deleted');
  //   });
        
  //   // for (let author of authors.keys()) {
  //   //   authors.set(author, Object.fromEntries(authors.get(author).entries()))
  //   // }

  //   // let output = JSON.stringify(Object.fromEntries(authors.entries()));

  //   // fs.writeFile(`analyses/${jobHash}`, JSON.stringify({analysis: output, progress: 100}), (err) => {
  //   //   if (err) {
  //   //     console.log(err)
  //   //   }
  //   // });
  //   done(null, output)
  // })

  let jobData = {
    repopath: url.searchParams.get('repopath'),
    ignores: url.searchParams.get('ignores') ? url.searchParams.get('ignores').split(',') : [],
    fromDate: url.searchParams.get('fromDate') ? url.searchParams.get('fromDate') : ''
  }

  var jobHash = hash(jobData)

  let output = ''


  let repopath = jobData.repopath
    let ignores = jobData.ignores
    let files = [];
    const fromDate = new Date(jobData.fromDate).getTime() / 1000 

    const result = await fg([repopath + '/**/*'], { dot: true })
    const repotree = parse(result, repopath)
    repotree.forEach((file) => {
      files = files.concat(extractFiles(file, ignores))
    });
    // fs.writeFile(`analyses/${jobHash}`, JSON.stringify({analysis: '{}', progress: 0}), (err) => {
    //   if (err) {
    //     console.log(err)
    //   }
    // });
    console.log('files.length', files.length);
 
    let authors = new Map();
    var step = (files.length - files.length % 10) / 10;

    for (let i = 0; i < files.length; i++) {
      let file = files[i]
      let dirpath = file.split('/');
      const filename = dirpath.pop();
      dirpath = dirpath.join('/');
      let ext = filename.split('.').pop()

      var requestBlame = `cd ${dirpath} && git blame ${filename} -p`
      const gitblame = shell.exec(requestBlame, { silent: true }).stdout;
      const blamejs = new BlameJS();  
      blamejs.parseBlame(gitblame);
      var commitData = blamejs.getCommitData();
      var lineData = blamejs.getLineData();

      for (let ind in lineData) {
        let author = commitData[lineData[ind].hash]["authorMail"];
        let newLine = jobData.fromDate ? commitData[lineData[ind].hash]["authorTime"] >= fromDate ? 1 : 0 : 1;
        // newLines += newLine
        if (newLine == 1) {
          var time = new Date(commitData[lineData[ind].hash]["authorTime"] * 1000);
  
          var theyear = time.getFullYear();
          var themonth = time.getMonth() + 1;
          var thetoday = time.getDate();
          console.log(`${author} || ${file} || ${ind} || ${theyear + "/" + themonth + "/" + thetoday}`)
        }

        if (authors.get(author)) {
          if (authors.get(author).get(ext)) {
              authors.get(author).set(ext, authors.get(author).get(ext) + newLine)
          } else {
              authors.get(author).set(ext, newLine)
          }
          authors.get(author).set('.all', authors.get(author).get('.all') + newLine)
        } else {
          let newAuthor = new Map()
          newAuthor.set(ext, newLine)
          newAuthor.set('.all', newLine)
          authors.set(author, newAuthor)
        }
      }

      if (i % step == 0 && 0 < (i / step)  && (i / step) < 10) {
        let intermediateAuthors = new Map()
        for (let author of authors.keys()) {
          intermediateAuthors.set(author, Object.fromEntries(authors.get(author).entries()))
        }
        let intermediate = JSON.stringify(Object.fromEntries(intermediateAuthors.entries()));
        
        var interProgress = 10 * (i / step)
        // fs.rm(`analyses/process_${interProgress - 10}_${jobHash}`)
        if (interProgress !== 10) {
          fs.unlink(`analyses/process_${interProgress - 10}_${jobHash}`, (err) => {
            if (err) throw err;
            // console.log('path/file.txt was deleted');
          });
        }

        fs.writeFileSync(`analyses/process_${interProgress}_${jobHash}`, JSON.stringify({analysis: intermediate, progress: interProgress}));
      }
    }

    let resultAuthors = new Map()
    for (let author of authors.keys()) {
      resultAuthors.set(author, Object.fromEntries(authors.get(author).entries()))
    }
    let resultOutput = JSON.stringify(Object.fromEntries(resultAuthors.entries()));
    fs.writeFileSync(`analyses/process_100_${jobHash}`, JSON.stringify({analysis: resultOutput, progress: 100, status: 'success'}));

    fs.unlink(`analyses/process_90_${jobHash}`, (err) => {
      if (err) throw err;
      // console.log('path/file.txt was deleted');
    });
  
  try {
    var existenceFlag = false
    for (var p = 0; p <= 10; p++) {
      // console.log(p)
      // fs.access("./myFolder/myFile.txt", (error) => {
      //   if (error) {
      //     console.log(error);
      //     return;
      //   }
      
      //   console.log("File Exists!");
      // });
      // console.log(`analyses/process_${10 * p}_${jobHash}`)
      var path = `analyses/process_${10 * p}_${jobHash}`
      fs.exists(path, (exists) => {
        if (exists) {
          existenceFlag = true
          // console.log(path)
          fs.readFile(path, (err, data) => {
            if (err) {
              console.error(err);
              return;
            }
            output = data;
            // console.log(output.length == 0)
          });
          // console.log(`analyses/process_${10 * p - 10}_${jobHash}`)
          // let fileData = fs.readFileSync(`analyses/process_${10 * p}_${jobHash}`, {encoding: 'utf8', flag: 'r'})
        }
      });
      if (fs.existsSync(path)) {
        // fs.writeFileSync(`analyses/true_${jobHash}`, p);
        // fs.readFile(path, (err, data) => {
        //   if (err) {
        //     console.error(err);
        //     return;
        //   }
        //   console.log(data);
        // });

        let fileData = fs.readFileSync(path, {encoding: 'utf8', flag: 'r'})
        output = fileData
        break
      } else {
        console.log(`${path} path does not exist`)
      }
      // console.log(p == 10 && output.length == 0 && !existenceFlag)
      // console.log(existenceFlag)
      if (p == 10 && output.length == 0) {
        // chartQueue.add(jobData)
      }
    }
  } catch (err) {
    console.log('something went wrong', err)
    // chartQueue.add(jobData)
  }

  // chartQueue.on('error', (err) => {
  //   fs.writeFile(`analyses/process_100_${jobHash}`, JSON.stringify({status: 'failed', error: JSON.stringify(err), progress: 100, analysis: '{}'}), (erro) => {
  //     if (erro) {
  //       console.log(erro)
  //     }
  //   });
  //     console.log(err);
  // })

  res.write(JSON.stringify(output))
  res.end()
  return
}