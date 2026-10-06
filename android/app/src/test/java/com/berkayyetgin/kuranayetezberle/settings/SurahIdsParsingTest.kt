package com.berkayyetgin.kuranayetezberle.settings

import org.junit.Assert.assertEquals
import org.junit.Test

class SurahIdsParsingTest {
    @Test
    fun keepsOrderAndDropsMalformedOutOfRangeAndRepeatedIds() {
        assertEquals(listOf(114, 1, 36), parseSurahIds("114, 1,abc,0,115,1,,36"))
    }

    @Test
    fun missingOrBlankValueIsAnEmptyList() {
        assertEquals(emptyList<Int>(), parseSurahIds(null))
        assertEquals(emptyList<Int>(), parseSurahIds(""))
    }
}
