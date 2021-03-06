// 初始化小说排行榜页面
import { InitPageBase } from './InitPageBase'
import { Colors } from './Colors'
import { lang } from './Lang'
import { DOM } from './DOM'
import { options } from './Options'
import { FilterOption } from './Filter.d'
import { filter } from './Filter'
import { store } from './Store'
import { log } from './Log'

class InitNovelRankingPage extends InitPageBase {
  constructor() {
    super()
    this.init()
  }

  private pageCount: number = 2 // 排行榜的页数

  private pageUrlList: string[] = []

  protected appendCenterBtns() {
    DOM.addBtn('crawlBtns', Colors.blue, lang.transl('_抓取本排行榜作品'), [
      ['title', lang.transl('_抓取本排行榜作品Title')],
    ]).addEventListener('click', () => {
      this.readyCrawl()
    })
  }

  protected setFormOption() {
    // 设置“个数/页数”选项
    this.maxCount = 100

    options.setWantPage({
      text: lang.transl('_个数'),
      tip: lang.transl('_想要获取多少个作品'),
      rangTip: `1 - ${this.maxCount}`,
      value: this.maxCount.toString(),
    })
  }

  protected getWantPage() {
    // 检查下载页数的设置
    this.crawlNumber = this.checkWantPageInput(
      lang.transl('_下载排行榜前x个作品'),
      lang.transl('_向下获取所有作品')
    )
    // 如果设置的作品个数是 -1，则设置为下载所有作品
    if (this.crawlNumber === -1) {
      this.crawlNumber = this.maxCount
    }
  }

  private getPageUrl() {
    const ul = document.querySelector('.ui-selectbox-container ul')
    if (ul) {
      const li = ul.querySelectorAll('li')
      this.pageCount = li.length
      this.maxCount = this.pageCount * 50

      for (const el of li) {
        this.pageUrlList.push(el.dataset.url!)
      }
    }
  }

  protected nextStep() {
    this.getPageUrl()
    this.getIdList()
  }

  protected async getIdList() {
    let dom: HTMLDocument
    try {
      const res = await fetch(this.pageUrlList[this.listPageFinished])
      const text = await res.text()
      const parse = new DOMParser()
      dom = parse.parseFromString(text, 'text/html')
    } catch (error) {
      this.getIdList()
      return
    }

    this.listPageFinished++

    const rankingItem = dom.querySelectorAll(
      '._ranking-items>div'
    ) as NodeListOf<HTMLDivElement>

    // 检查每个作品的信息
    for (const item of rankingItem) {
      const rank = parseInt(item.querySelector('h1')!.innerText)
      // 检查是否已经抓取到了指定数量的作品
      if (rank > this.crawlNumber) {
        return this.getIdListFinished()
      }

      // https://www.pixiv.net/novel/show.php?id=12831389
      const link = (item.querySelector('.imgbox a') as HTMLAnchorElement)!.href
      const id = parseInt(link.split('id=')[1])

      const bmkEl = item.querySelector('.bookmark-count') as HTMLAnchorElement
      let bmk: number = bmkEl ? parseInt(bmkEl.innerText) : 0

      const tags: string[] = []
      const tagsA = item.querySelectorAll('.tags>li>a') as NodeListOf<
        HTMLAnchorElement
      >
      for (const a of tagsA) {
        tags.push(a.innerText.trim())
      }

      const bookmarked = item
        .querySelector('._one-click-bookmark')!
        .classList.contains('on')

      const filterOpt: FilterOption = {
        id: id,
        illustType: 3,
        tags: tags,
        bookmarkCount: bmk,
        bookmarkData: bookmarked,
      }

      if (await filter.check(filterOpt)) {
        store.setRankList(id.toString(), rank.toString())

        store.idList.push({
          type: 'novels',
          id: id.toString(),
        })
      }
    }

    log.log(
      lang.transl('_排行榜进度', this.listPageFinished.toString()),
      1,
      false
    )

    // 抓取完毕
    if (this.listPageFinished === this.pageCount) {
      this.getIdListFinished()
    } else {
      // 继续抓取
      this.getIdList()
    }
  }

  protected resetGetIdListStatus() {
    this.pageUrlList = []
    this.listPageFinished = 0
  }
}
export { InitNovelRankingPage }
