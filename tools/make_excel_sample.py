from openpyxl import Workbook
from datetime import datetime

wb = Workbook()
ws = wb.active
ws.title = "进场周计划"
ws.append(["序号", "任务", "截止日期", "负责人", "优先级", "状态"])
ws.append([1, "提交进场资料", datetime(2026, 10, 30), "张三", "高", "待办"])
ws.append([2, "确认施工人员名单", datetime(2026, 11, 2), "李四", "中", "进行中"])
ws.append([3, "完成安全培训", datetime(2026, 10, 24), "王五", "高", "已完成"])
ws.append([4, "提交周报", datetime(2026, 10, 24, 18, 0), "张三", "低", "待办"])
ws.append([5, "合计", None, None, None, None])

ws2 = wb.create_sheet("风险清单")
ws2.append(["风险", "跟进人", "计划关闭日期"])
ws2.append(["材料到货延迟", "赵六", datetime(2026, 11, 5)])
wb.save(r"D:\代码\today-block\samples\进场周计划.xlsx")
print("xlsx written")
