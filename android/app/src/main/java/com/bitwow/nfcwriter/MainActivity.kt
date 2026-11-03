package com.bitwow.nfcwriter

import android.annotation.SuppressLint
import android.app.Activity
import android.graphics.Color
import android.nfc.NdefMessage
import android.nfc.NdefRecord
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.Ndef
import android.nfc.tech.NdefFormatable
import android.os.Bundle
import android.provider.Settings
import android.content.Intent
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.nio.charset.StandardCharsets
import java.util.Locale

@SuppressLint("SetTextI18n")
class MainActivity : Activity(), NfcAdapter.ReaderCallback {
    companion object {
        private const val TARGET_URL = "https://bitwow.github.io/nfc-business-card/"
        private val TARGET_MESSAGE = NdefMessage(arrayOf(NdefRecord.createUri(TARGET_URL)))
        private const val BG = 0xFF111315.toInt()
        private const val SURFACE = 0xFF1B1F22.toInt()
        private const val TEXT = 0xFFF6F1E8.toInt()
        private const val MUTED = 0xFFB8B5AE.toInt()
        private const val ACCENT = 0xFFD6FF54.toInt()
    }

    private enum class Stage { IDLE, WAITING_FOR_PREVIEW, PREVIEWED, ARMED, SUCCESS }

    private data class Inspection(
        val tagId: ByteArray,
        val writable: Boolean,
        val capacity: Int?,
        val existing: String,
        val formatable: Boolean
    )

    private lateinit var nfcAdapter: NfcAdapter
    private lateinit var statusView: TextView
    private lateinit var detailsView: TextView
    private lateinit var actionButton: Button
    private lateinit var resetButton: Button
    private var stage = Stage.IDLE
    private var approvedTagId: ByteArray? = null
    private var lastInspection: Inspection? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        nfcAdapter = NfcAdapter.getDefaultAdapter(this)
        setContentView(buildUi())
        updateNfcState()
    }

    override fun onResume() {
        super.onResume()
        if (::nfcAdapter.isInitialized) {
            nfcAdapter.enableReaderMode(
                this,
                this,
                NfcAdapter.FLAG_READER_NFC_A or
                    NfcAdapter.FLAG_READER_NFC_B or
                    NfcAdapter.FLAG_READER_NFC_F or
                    NfcAdapter.FLAG_READER_NFC_V,
                Bundle().apply { putInt(NfcAdapter.EXTRA_READER_PRESENCE_CHECK_DELAY, 250) }
            )
        }
        updateNfcState()
    }

    override fun onPause() {
        if (::nfcAdapter.isInitialized) nfcAdapter.disableReaderMode(this)
        super.onPause()
    }

    private fun buildUi(): View {
        val density = resources.displayMetrics.density
        fun dp(value: Int) = (value * density).toInt()

        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(24), dp(28), dp(24), dp(36))
            setBackgroundColor(BG)
        }

        content.addView(text("NFC WRITER", 13f, ACCENT, true).apply {
            letterSpacing = 0.14f
        })
        content.addView(text("Визитка Дмитрия\nВасильева", 34f, TEXT, true).apply {
            setPadding(0, dp(12), 0, dp(20))
        })
        content.addView(text("Целевой HTTPS URL", 13f, MUTED, true))
        content.addView(text(TARGET_URL, 17f, ACCENT, false).apply {
            setTextIsSelectable(true)
            setPadding(0, dp(6), 0, dp(20))
        })

        statusView = text("Проверяю NFC…", 19f, TEXT, true)
        detailsView = text("", 15f, MUTED, false).apply {
            setTextIsSelectable(true)
            setLineSpacing(0f, 1.18f)
        }
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(18), dp(18), dp(18))
            setBackgroundColor(SURFACE)
            addView(statusView)
            addView(detailsView, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(12) })
        }
        content.addView(card, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(18) })

        actionButton = Button(this).apply {
            text = "Подготовить чтение"
            isAllCaps = false
            textSize = 16f
            setTextColor(0xFF151900.toInt())
            setBackgroundColor(ACCENT)
            minHeight = dp(56)
            setOnClickListener { handlePrimaryAction() }
        }
        content.addView(actionButton, LinearLayout.LayoutParams(-1, dp(58)))

        resetButton = Button(this).apply {
            text = "Сбросить / отменить"
            isAllCaps = false
            textSize = 15f
            setTextColor(TEXT)
            setBackgroundColor(SURFACE)
            minHeight = dp(52)
            visibility = View.GONE
            setOnClickListener { resetFlow() }
        }
        content.addView(resetButton, LinearLayout.LayoutParams(-1, dp(54)).apply { topMargin = dp(10) })

        content.addView(text(
            "Безопасность: первое касание только читает метку. Запись начнётся только после отдельного подтверждения и повторного касания. Пароль, read-only и lock bytes не используются.",
            13f,
            MUTED,
            false
        ).apply { setPadding(0, dp(22), 0, 0) })

        return ScrollView(this).apply {
            setBackgroundColor(BG)
            isFillViewport = true
            addView(content)
        }
    }

    private fun text(value: String, size: Float, color: Int, bold: Boolean) = TextView(this).apply {
        text = value
        textSize = size
        setTextColor(color)
        gravity = Gravity.START
        if (bold) setTypeface(typeface, android.graphics.Typeface.BOLD)
    }

    private fun updateNfcState() {
        if (!::nfcAdapter.isInitialized) return
        when {
            !nfcAdapter.isEnabled -> {
                statusView.text = "NFC выключен"
                detailsView.text = "Включите NFC в настройках телефона."
                actionButton.text = "Открыть настройки NFC"
            }
            stage == Stage.IDLE -> {
                statusView.text = "Готов к безопасному чтению"
                detailsView.text = "Сначала приложение покажет текущие NDEF-записи, объём и статус записи."
                actionButton.text = "Подготовить чтение"
                actionButton.isEnabled = true
            }
        }
    }

    private fun handlePrimaryAction() {
        if (!nfcAdapter.isEnabled) {
            startActivity(Intent(Settings.ACTION_NFC_SETTINGS))
            return
        }
        when (stage) {
            Stage.IDLE, Stage.SUCCESS -> {
                stage = Stage.WAITING_FOR_PREVIEW
                approvedTagId = null
                lastInspection = null
                statusView.text = "Приложите метку для чтения"
                detailsView.text = "На этом шаге запись не выполняется."
                actionButton.isEnabled = false
                resetButton.visibility = View.VISIBLE
            }
            Stage.PREVIEWED -> {
                val inspection = lastInspection ?: return
                approvedTagId = inspection.tagId.copyOf()
                stage = Stage.ARMED
                statusView.text = "Запись подтверждена"
                detailsView.text = "Уберите и снова приложите ту же метку. Будет записана одна HTTPS URI-запись:\n$TARGET_URL"
                actionButton.text = "Ожидаю повторное касание…"
                actionButton.isEnabled = false
            }
            Stage.WAITING_FOR_PREVIEW, Stage.ARMED -> Unit
        }
    }

    private fun resetFlow() {
        stage = Stage.IDLE
        approvedTagId = null
        lastInspection = null
        resetButton.visibility = View.GONE
        updateNfcState()
    }

    override fun onTagDiscovered(tag: Tag) {
        when (stage) {
            Stage.WAITING_FOR_PREVIEW -> previewTag(tag)
            Stage.ARMED -> {
                val approved = approvedTagId
                if (approved == null || !tag.id.contentEquals(approved)) {
                    runOnUiThread {
                        stage = Stage.WAITING_FOR_PREVIEW
                        approvedTagId = null
                        statusView.text = "Это другая метка"
                        detailsView.text = "Новая метка не будет записана без отдельного предварительного чтения. Приложите её ещё раз."
                    }
                } else {
                    writeAndVerify(tag)
                }
            }
            else -> Unit
        }
    }

    private fun previewTag(tag: Tag) {
        val inspection = inspect(tag)
        lastInspection = inspection
        runOnUiThread {
            stage = Stage.PREVIEWED
            val required = TARGET_MESSAGE.toByteArray().size
            val capacity = inspection.capacity?.let { "$it байт" } ?: "не сообщается до форматирования"
            statusView.text = "Метка прочитана — запись ещё не выполнялась"
            detailsView.text = buildString {
                append("Идентификатор: ${tag.id.toHex()}\n")
                append("Технологии: ${tag.techList.joinToString()}\n")
                append("Доступно: $capacity\n")
                append("Нужно для URI: $required байт\n")
                append("Запись: ${if (inspection.writable) "доступна" else "недоступна"}\n\n")
                append("Текущее содержимое:\n${inspection.existing}")
            }
            val enoughSpace = inspection.capacity?.let { it >= required } ?: inspection.formatable
            actionButton.isEnabled = inspection.writable && enoughSpace
            actionButton.text = if (actionButton.isEnabled) {
                "Записать показанную метку"
            } else {
                "Запись недоступна"
            }
            resetButton.visibility = View.VISIBLE
        }
    }

    private fun inspect(tag: Tag): Inspection {
        val ndef = Ndef.get(tag)
        if (ndef != null) {
            return try {
                ndef.connect()
                val message = ndef.ndefMessage
                Inspection(
                    tag.id.copyOf(),
                    ndef.isWritable,
                    ndef.maxSize,
                    describeMessage(message),
                    false
                )
            } catch (error: Exception) {
                Inspection(tag.id.copyOf(), false, null, "Ошибка чтения: ${error.message}", false)
            } finally {
                try { ndef.close() } catch (_: Exception) { }
            }
        }
        val formatable = NdefFormatable.get(tag) != null
        return Inspection(
            tag.id.copyOf(),
            formatable,
            null,
            if (formatable) "NDEF ещё не сформатирован" else "NDEF не поддерживается",
            formatable
        )
    }

    private fun writeAndVerify(tag: Tag) {
        val required = TARGET_MESSAGE.toByteArray().size
        val result = try {
            val ndef = Ndef.get(tag)
            if (ndef != null) {
                ndef.connect()
                if (!ndef.isWritable) error("Метка защищена от записи")
                if (ndef.maxSize < required) error("Нужно $required байт, доступно ${ndef.maxSize}")
                ndef.writeNdefMessage(TARGET_MESSAGE)
                ndef.close()

                val verify = Ndef.get(tag) ?: error("Не удалось повторно открыть NDEF")
                verify.connect()
                val readBack = verify.ndefMessage
                verify.close()
                verifyMessage(readBack)
            } else {
                val formatable = NdefFormatable.get(tag) ?: error("Метка не поддерживает NDEF")
                formatable.connect()
                formatable.format(TARGET_MESSAGE)
                formatable.close()
                val verify = Ndef.get(tag) ?: error("После форматирования NDEF не найден")
                verify.connect()
                val readBack = verify.ndefMessage
                verify.close()
                verifyMessage(readBack)
            }
        } catch (error: Exception) {
            Result.failure(error)
        }

        runOnUiThread {
            result.fold(
                onSuccess = {
                    stage = Stage.SUCCESS
                    statusView.text = "Запись и повторное чтение успешны"
                    detailsView.text = "На метке одна NDEF URI-запись:\n$TARGET_URL\n\nМетка осталась перезаписываемой."
                    actionButton.text = "Прочитать другую метку"
                    actionButton.isEnabled = true
                    resetButton.visibility = View.GONE
                },
                onFailure = { error ->
                    stage = Stage.IDLE
                    approvedTagId = null
                    statusView.text = "Запись не выполнена"
                    detailsView.text = error.message ?: "Неизвестная ошибка"
                    actionButton.text = "Повторить с чтения"
                    actionButton.isEnabled = true
                }
            )
        }
    }

    private fun verifyMessage(message: NdefMessage?): Result<Unit> {
        if (message == null || message.records.size != 1) {
            return Result.failure(IllegalStateException("Повторное чтение: ожидалась одна NDEF-запись"))
        }
        val actual = message.records[0].toUri()?.toString()
        return if (actual == TARGET_URL) Result.success(Unit)
        else Result.failure(IllegalStateException("Повторное чтение вернуло: $actual"))
    }

    private fun describeMessage(message: NdefMessage?): String {
        if (message == null || message.records.isEmpty()) return "NDEF-записей нет"
        return message.records.mapIndexed { index, record ->
            val uri = record.toUri()?.toString()
            val type = String(record.type, StandardCharsets.US_ASCII).ifBlank { "без типа" }
            "${index + 1}. ${uri?.let { "URI: $it" } ?: "TNF=${record.tnf}, type=$type, ${record.payload.size} байт"}"
        }.joinToString("\n")
    }

    private fun ByteArray.toHex(): String = joinToString(":") {
        String.format(Locale.US, "%02X", it.toInt() and 0xFF)
    }
}
