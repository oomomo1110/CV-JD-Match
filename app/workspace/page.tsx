import WorkspaceClient from "./WorkspaceClient";

export default function WorkspacePage() {
  return (
    <>
      <WorkspaceClient />
      <WorkspaceFallbackScript />
    </>
  );
}

function WorkspaceFallbackScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: String.raw`
(function () {
  if (window.__cvJdFallbackBound) {
    return;
  }
  window.__cvJdFallbackBound = true;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function bindWorkspace() {
    var form = document.querySelector("[data-cv-form]");
    var fileInput = document.querySelector("[data-resume-file-input]");
    var resumeTextarea = document.querySelector("[data-resume-textarea]");
    var jdTextarea = document.querySelector("[data-jd-textarea]");
    var selectedFile = document.querySelector("[data-selected-file]");
    var uploadStatus = document.querySelector("[data-upload-status]");
    var errorBox = document.querySelector("[data-error-box]");
    var resultRoot = document.querySelector("[data-result-root]");
    var submitButton = form ? form.querySelector("button[type='submit']") : null;

    if (!form || !fileInput || !resumeTextarea || !jdTextarea || !submitButton || !resultRoot) {
      window.setTimeout(bindWorkspace, 300);
      return;
    }

    function setError(message) {
      if (!errorBox) {
        return;
      }
      if (!message) {
        errorBox.textContent = "";
        errorBox.classList.add("hidden");
        return;
      }
      errorBox.textContent = message;
      errorBox.classList.remove("hidden");
    }

    function setUploadStatus(type, message) {
      if (!uploadStatus) {
        return;
      }
      if (!message) {
        uploadStatus.textContent = "";
        uploadStatus.className = "hidden rounded-lg border px-3 py-2 text-sm leading-6";
        return;
      }
      var colorClass =
        type === "success"
          ? "border-[#b8eadf] bg-[#f0fffb] text-[#086b5c]"
          : type === "error"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-coral/30 bg-white text-coral";
      uploadStatus.className = "rounded-lg border px-3 py-2 text-sm leading-6 " + colorClass;
      uploadStatus.textContent = message;
    }

    function updateSubmitState() {
      var hasResume = resumeTextarea.value.trim().length > 0;
      var hasJd = jdTextarea.value.trim().length > 0;
      var ready = hasResume && hasJd;
      submitButton.setAttribute("aria-disabled", String(!ready));
      submitButton.className =
        "h-12 rounded-lg px-6 text-sm font-bold text-white shadow-button transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 " +
        (ready ? "bg-ink hover:bg-[#0f172a]" : "bg-slate-400 hover:bg-slate-500");
    }

    function renderList(title, items, dotClass) {
      var safeItems = Array.isArray(items) && items.length ? items : ["暂无明确结果。"];
      return (
        '<section class="rounded-lg border border-white bg-white p-4 shadow-pop">' +
        '<h2 class="text-base font-black text-ink">' + escapeHtml(title) + "</h2>" +
        '<ul class="mt-3 space-y-2 text-sm leading-6 text-muted">' +
        safeItems
          .map(function (item) {
            return '<li class="flex gap-2"><span class="mt-2 h-2 w-2 flex-none rounded-full ' + dotClass + '"></span><span>' + escapeHtml(item) + "</span></li>";
          })
          .join("") +
        "</ul></section>"
      );
    }

    function renderBulletTable(bullets, emptyText) {
      var rows = bullets.length
        ? bullets
            .map(function (bullet) {
              return (
                "<tr class=\"align-top\">" +
                '<td class="border-b border-line px-4 py-4 leading-6 text-ink">' + escapeHtml(bullet.original) + "</td>" +
                '<td class="border-b border-line px-4 py-4 leading-6 text-ink">' + escapeHtml(bullet.revised) + "</td>" +
                '<td class="border-b border-line px-4 py-4 leading-6 text-muted">' + escapeHtml(bullet.reason) + "</td>" +
                '<td class="border-b border-line px-4 py-4"><span class="rounded-full px-3 py-1 text-xs font-bold ' +
                (bullet.needs_user_confirmation ? "bg-lemon text-[#775e00]" : "bg-mint text-[#086b5c]") +
                '">' +
                (bullet.needs_user_confirmation ? "需要" : "已足够") +
                "</span></td></tr>"
              );
            })
            .join("")
        : '<tr><td colspan="4" class="border-b border-line px-4 py-4 text-sm leading-6 text-muted">' + escapeHtml(emptyText) + "</td></tr>";

      return (
        '<div class="overflow-x-auto"><table class="w-full min-w-[900px] border-collapse text-left text-sm">' +
        '<thead class="bg-[#f8fbff] text-muted"><tr><th class="w-[26%] border-b border-line px-4 py-3 font-bold">原始 bullet</th><th class="w-[32%] border-b border-line px-4 py-3 font-bold">优化后 bullet</th><th class="w-[28%] border-b border-line px-4 py-3 font-bold">修改原因</th><th class="w-[14%] border-b border-line px-4 py-3 font-bold">需确认</th></tr></thead>' +
        "<tbody>" + rows + "</tbody></table></div>"
      );
    }

    function renderRefinedResult(result) {
      var bullets = Array.isArray(result.revised_bullets) ? result.revised_bullets : [];
      return (
        '<section data-refined-result class="mt-5 overflow-hidden rounded-lg border border-sky/20 bg-white shadow-soft">' +
        '<div class="border-b border-line px-4 py-4"><h3 class="text-base font-black text-ink">根据补充信息生成的优化版本</h3>' +
        '<p class="mt-1 text-sm leading-6 text-muted">保留首次结果，并单独展示吸收补充回答后的二次优化建议。</p></div>' +
        renderBulletTable(bullets, "暂无可展示的二次优化 bullet。") +
        "</section>"
      );
    }

    function bindFollowUpForm(result, resumeText, jdText) {
      var followUpForm = resultRoot.querySelector("[data-follow-up-form]");
      var refineError = resultRoot.querySelector("[data-refine-error]");
      var refinedMount = resultRoot.querySelector("[data-refined-mount]");
      var refineButton = followUpForm ? followUpForm.querySelector("button[type='submit']") : null;

      if (!followUpForm || !refineButton || !refinedMount) {
        return;
      }

      function setRefineError(message) {
        if (!refineError) {
          return;
        }
        if (!message) {
          refineError.textContent = "";
          refineError.classList.add("hidden");
          return;
        }
        refineError.textContent = message;
        refineError.classList.remove("hidden");
      }

      function collectAnswers() {
        return Array.from(followUpForm.querySelectorAll("[data-follow-up-answer]"))
          .map(function (textarea) {
            return {
              question: textarea.getAttribute("data-question") || "",
              answer: textarea.value.trim()
            };
          })
          .filter(function (item) {
            return item.answer;
          });
      }

      function updateRefineButton() {
        refineButton.disabled = collectAnswers().length === 0;
      }

      followUpForm.querySelectorAll("[data-follow-up-answer]").forEach(function (textarea) {
        textarea.addEventListener("input", updateRefineButton);
      });

      followUpForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        var followUpAnswers = collectAnswers();

        if (!followUpAnswers.length) {
          setRefineError("请先补充至少一个回答。");
          updateRefineButton();
          return;
        }

        setRefineError("");
        refineButton.disabled = true;
        refineButton.textContent = "正在根据补充信息继续优化...";

        try {
          var response = await fetch("/api/refine-optimization", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              resumeText: resumeText,
              jdText: jdText,
              optimizationResult: result,
              followUpAnswers: followUpAnswers
            })
          });
          var data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || "根据补充信息继续优化失败，请稍后重试。");
          }
          refinedMount.innerHTML = renderRefinedResult(data);
        } catch (error) {
          setRefineError(error instanceof Error ? error.message : "根据补充信息继续优化失败，请稍后重试。");
        } finally {
          refineButton.textContent = "提交补充信息并继续优化";
          updateRefineButton();
        }
      });

      updateRefineButton();
    }

    function renderResult(result, resumeText, jdText) {
      var bullets = Array.isArray(result.revised_bullets) ? result.revised_bullets : [];
      var questions = Array.isArray(result.follow_up_questions) && result.follow_up_questions.length
        ? result.follow_up_questions
        : ["请补充你在这些经历中的具体负责范围、关键行动和可验证结果。"];
      var questionFields = questions
        .map(function (question) {
          return (
            '<label class="block rounded-lg border border-line bg-[#f8fbff] p-3">' +
            '<span class="block text-sm font-bold leading-6 text-ink">' + escapeHtml(question) + "</span>" +
            '<textarea data-follow-up-answer data-question="' + escapeHtml(question) + '" placeholder="请补充你的具体经历，例如你负责的模块、使用的技术、遇到的问题、解决方法和最终结果" class="mt-3 min-h-[110px] w-full resize-y rounded-lg border border-line bg-white p-3 text-sm leading-6 text-ink outline-none transition placeholder:text-slate-400 focus:border-sky focus:ring-4 focus:ring-sky/15"></textarea>' +
            "</label>"
          );
        })
        .join("");

      resultRoot.innerHTML =
        '<div class="space-y-5">' +
        '<div class="grid gap-4 lg:grid-cols-3">' +
        renderList("JD 关键词", result.jd_keywords, "bg-sky") +
        renderList("匹配点", result.matched_points, "bg-[#13b99a]") +
        renderList("待补强", result.missing_points, "bg-[#f5c542]") +
        "</div>" +
        '<section class="overflow-hidden rounded-lg border border-white bg-white shadow-pop">' +
        '<div class="flex flex-col gap-2 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between">' +
        '<div><h2 class="text-lg font-black text-ink">项目经历优化对比</h2><p class="mt-1 text-sm text-muted">只展示项目、竞赛、校园实践等经历 bullet，不处理个人信息和教育背景。</p></div>' +
        '<span class="rounded-full bg-violet/10 px-3 py-1 text-xs font-bold text-violet">' + bullets.length + " 条建议</span>" +
        "</div>" +
        renderBulletTable(bullets, "当前 mock 逻辑没有识别到可改写的经历 bullet，请补充项目/实习/校园经历后重试。") +
        "</section>" +
        '<section data-follow-up-section class="rounded-lg border border-white bg-white p-4 shadow-pop">' +
        '<div class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><h2 class="text-lg font-black text-ink">追问补充对话</h2>' +
        '<p class="mt-1 text-sm leading-6 text-muted">逐条回答关键追问，系统会把你的补充信息传入后端生成二次优化版本。</p></div></div>' +
        '<form data-follow-up-form class="mt-4 space-y-4">' + questionFields +
        '<div data-refine-error class="hidden rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"></div>' +
        '<button type="submit" class="h-11 rounded-lg bg-sky px-5 text-sm font-bold text-white shadow-button transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300">提交补充信息并继续优化</button>' +
        "</form><div data-refined-mount></div></section></div>";
      bindFollowUpForm(result, resumeText, jdText);
    }

    async function extractFile(file) {
      if (!file) {
        return;
      }

      var lowerName = file.name.toLowerCase();
      if (selectedFile) {
        selectedFile.textContent = "已选择：" + file.name;
      }

      if (lowerName.endsWith(".doc") && !lowerName.endsWith(".docx")) {
        var docMessage = "暂不支持旧版 .doc 文件，请另存为 .docx 或 PDF 后上传。";
        setUploadStatus("error", "解析失败：" + docMessage);
        setError(docMessage);
        return;
      }

      setError("");
      setUploadStatus("extracting", "正在解析「" + file.name + "」...");

      try {
        var formData = new FormData();
        formData.append("file", file);
        var response = await fetch("/api/extract-resume", { method: "POST", body: formData });
        var data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "文件解析失败，请换一个文件重试。");
        }
        resumeTextarea.value = data.text || "";
        resumeTextarea.dispatchEvent(new Event("input", { bubbles: true }));
        setUploadStatus("success", "解析成功：已读取约 " + resumeTextarea.value.length + " 个字符，并已填入下方文本框。");
        updateSubmitState();
      } catch (error) {
        var message = error instanceof Error ? error.message : "文件解析失败，请换一个文件重试。";
        setUploadStatus("error", "解析失败：" + message);
        setError(message);
      }
    }

    fileInput.addEventListener(
      "change",
      function (event) {
        event.stopImmediatePropagation();
        extractFile(fileInput.files && fileInput.files[0]);
      },
      true
    );

    resumeTextarea.addEventListener("input", updateSubmitState);
    jdTextarea.addEventListener("input", updateSubmitState);

    form.addEventListener(
      "submit",
      async function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        var resumeText = resumeTextarea.value.trim();
        var jdText = jdTextarea.value.trim();
        if (!resumeText || !jdText) {
          setError(!resumeText ? "请先上传/粘贴简历文本。" : "请先填写目标岗位 JD。");
          updateSubmitState();
          return;
        }

        setError("");
        submitButton.disabled = true;
        submitButton.textContent = "正在优化...";
        try {
          var response = await fetch("/api/optimize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resumeText: resumeText, jdText: jdText })
          });
          var data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || "请求失败，请稍后重试。");
          }
          renderResult(data, resumeText, jdText);
        } catch (error) {
          setError(error instanceof Error ? error.message : "请求失败，请稍后重试。");
        } finally {
          submitButton.disabled = false;
          submitButton.textContent = "开始优化";
          updateSubmitState();
        }
      },
      true
    );

    updateSubmitState();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindWorkspace);
  } else {
    bindWorkspace();
  }
})();
`
      }}
    />
  );
}
