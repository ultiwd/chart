export const modalTemplate = teamLabels => `<div class="modal-layout">
<div class="modal-content">
  <span class="modal-close">❌</span>
  <div class="modal-title">Настройки</div>
  <div class="modal-body">
    <div>
      <label for="fullscreen">Полноэкранный режим</label>
      <input name="fullscreen" id="fullscreen" type="checkbox" />
    </div>
    <div>
      <label form="team">Выбор команды</label>
      <select name="team" id="team" class="select-css">
        ${teamLabels
          .map(
            label =>
              `<option ${label.selected && "selected"}>${label.name}</option>`
          )
          .join("")}
      </select>
    </div>
  </div>
  <div class="modal-footer"></div>
</div>
</div>`;
