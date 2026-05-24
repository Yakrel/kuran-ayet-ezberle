package com.berkayyetgin.kuranayetezberle.data

import org.junit.Assert.assertEquals
import org.junit.Test

class QuranPagePolicyTest {
    @Test
    fun acceptsCanonicalQuranPageRange() {
        assertEquals(1, QuranPagePolicy.requireValidPage(1, "1:1"))
        assertEquals(604, QuranPagePolicy.requireValidPage(604, "114:6"))
    }

    @Test(expected = IllegalStateException::class)
    fun rejectsZeroPage() {
        QuranPagePolicy.requireValidPage(0, "1:1")
    }

    @Test(expected = IllegalStateException::class)
    fun rejectsPageAfterMushafEnd() {
        QuranPagePolicy.requireValidPage(605, "114:6")
    }
}
