from django import forms
from django.utils.safestring import mark_safe


class ScheduleWidget(forms.Widget):
    def render(self, name, value, attrs=None, renderer=None):
        html = """
        <div id="schedule-editor">
            <button type="button" id="add-schedule-item" class="button" 
                    style="margin-bottom: 10px;">+ Добавить день</button>
            <div id="schedule-items-container"></div>
            <input type="hidden" name="{name}" id="id_{name}" value='{value}'>
        </div>

        <script>
        document.addEventListener('DOMContentLoaded', function() {{
            const container = document.getElementById('schedule-items-container');
            const hiddenInput = document.getElementById('id_{name}');
            let scheduleData = {value} || [];

            function updateHiddenInput() {{
                hiddenInput.value = JSON.stringify(scheduleData);
            }}

            function renderItems() {{
                container.innerHTML = '';
                scheduleData.forEach((item, index) => {{
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'schedule-item';
                    itemDiv.style.marginBottom = '5px';
                    itemDiv.innerHTML = `
                        <select class="day-select" data-index="${{index}}">
                            <option value="monday" ${{item.day === 'monday' ? 'selected' : ''}}>Понедельник</option>
                            <option value="tuesday" ${{item.day === 'tuesday' ? 'selected' : ''}}>Вторник</option>
                            <option value="wednesday" ${{item.day === 'wednesday' ? 'selected' : ''}}>Среда</option>
                            <option value="thursday" ${{item.day === 'thursday' ? 'selected' : ''}}>Четверг</option>
                            <option value="friday" ${{item.day === 'friday' ? 'selected' : ''}}>Пятница</option>
                            <option value="saturday" ${{item.day === 'saturday' ? 'selected' : ''}}>Суббота</option>
                            <option value="sunday" ${{item.day === 'sunday' ? 'selected' : ''}}>Воскресенье</option>
                        </select>
                        <select class="time-select" data-index="${{index}}">
                            ${{Array(24).fill().map((_, i) => {{
                                const hour = i.toString().padStart(2, '0') + ':00';
                                return `<option value="${{hour}}" ${{item.time === hour ? 'selected' : ''}}>${{hour}}</option>`;
                            }}).join('')}}
                        </select>
                        <button type="button" class="delete-item" data-index="${{index}}">×</button>
                    `;
                    container.appendChild(itemDiv);
                }});
            }}

            document.getElementById('add-schedule-item').addEventListener('click', function() {{
                scheduleData.push({{day: 'monday', time: '10:00'}});
                renderItems();
                updateHiddenInput();
            }});

            container.addEventListener('change', function(e) {{
                if (e.target.classList.contains('day-select')) {{
                    const index = parseInt(e.target.dataset.index);
                    scheduleData[index].day = e.target.value;
                }}
                if (e.target.classList.contains('time-select')) {{
                    const index = parseInt(e.target.dataset.index);
                    scheduleData[index].time = e.target.value;
                }}
                updateHiddenInput();
            }});

            container.addEventListener('click', function(e) {{
                if (e.target.classList.contains('delete-item')) {{
                    const index = parseInt(e.target.dataset.index);
                    scheduleData.splice(index, 1);
                    renderItems();
                    updateHiddenInput();
                }}
            }});

            // Initial render
            renderItems();
        }});
        </script>
        """.format(name=name, value=value or '[]')

        return mark_safe(html)
