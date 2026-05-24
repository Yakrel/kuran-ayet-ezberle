package com.berkayyetgin.kuranayetezberle.data

object QuranPagePolicy {
    const val FIRST_PAGE = 1
    const val LAST_PAGE = 604

    fun requireValidPage(page: Int, verseKey: String): Int {
        check(page in FIRST_PAGE..LAST_PAGE) {
            "Unsupported data: Quran page $page for $verseKey is outside $FIRST_PAGE..$LAST_PAGE."
        }
        return page
    }
}
