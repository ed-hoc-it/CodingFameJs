/* eslint-disable */

function extractFiles (file) {
  if (file["children"].length === 0) {
    return [file.path]
  } else {
    let files = []
    file.children.forEach((child) => {
      files = files.concat(extractFiles(child))
    })
    return files
  }
}

export const state = () => ({
  repopath: '',
  impact: [],
  extensions: [],
  pieDatas: [],
  mainPieData: [],
  personalImpact: [],
  ignores: [],
})

export const getters = {
  getImpact (state) {
    return state.impact
  },
  getPieDatas (state) {
    return state.pieDatas
  },
  getMainPieData (state) {
    return state.mainPieData
  },
  getPersonalImpact (state) {
    return state.personalImpact
  }
}

export const mutations = {
  updateRepoData (state, payload) {
    state.repopath = payload.repopath
    state.ignores = payload.ignores

    let extractedFiles = payload.repotree.map((file) => (extractFiles(file))).reduce((p, c) => p.concat(c), []).map((file) => file.split('.').pop())
    let extensions = new Set(extractedFiles)
    state.extensions = Array.from(extensions)
  },
  setImpact (state, payload) {
    state.impact = payload.impact
    const pieLimit = 0.05

    let repoLen = Object.values(state.impact).reduce((p, c) => p + c['.all'], 0)
    let other = 0
    let mainExtensions = []

    state.pieDatas = [];
    ['.all'].concat(state.extensions).forEach((ext) => {
      let rex = Object.values(state.impact).filter((author) => author[ext]).reduce((p, c) => p + c[ext], 0)

      if (rex / repoLen >= pieLimit) {
        let currentExtension = [['Author', 'Lines of code']]
        let currentOther = 0
        Object.keys(state.impact).filter((author) => state.impact[author][ext]).forEach((author) => {
          let personalImpact = state.impact[author][ext]
          if (personalImpact / rex >= pieLimit) {
            currentExtension.push([author, personalImpact])
          } else {
            currentOther += personalImpact
          }
        })
        currentExtension.push(['other', currentOther])
        if (ext == '.all') {
          state.personalImpact = currentExtension
        } else {
          state.pieDatas.push({ext: ext, pieData: currentExtension})
          mainExtensions.push([ext, rex])
        }
      } else {
        other += rex
      }      
    })
    mainExtensions.push(['other', other])
    state.mainPieData = mainExtensions
  },
}

export const actions = {
  async reloadImpact({ state, commit }) {
    let impact = {analysis: {}}
      var impactTimer = setInterval(() => {
        this.$axios.$get(
          `/advancedgitblame?repopath=${escape(state.repopath)}&ignores=${state.ignores.join(',')}`
          ).then(function (data) {
            impact = JSON.parse(data)
            impact.analysis = JSON.parse(impact.analysis)
            commit('setImpact', {impact: impact.analysis})
            if (impact.progress && impact.progress == 100) {
              clearInterval(impactTimer)
        }
      })
    }, 10000) 
  }
}