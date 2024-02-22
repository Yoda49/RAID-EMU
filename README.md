# RAID-EMU

== ENG ==

RAID1 mode emulator node.js script with web-interface. The program intelligently copies all files from the source address (disk, folder, samba-share) to destination address (disk, folder or samba-share).

You can set the source address and destination address in the configuration file. The script takes two input parameters (source address and destination address). Example: node raid-emu.js c:\ d:\
If launch parameters are specified, they override the adresses specified in the configuration file. 

The program creates two virtual trees (STAGE 1 & STAGE 2) and then compares them (STAGE 3). Next, it deletes irrelevant (outdated or deleted from source) files (STAGE 4) and then copies new ones (STAGE 5).

==RUS==

Скрипт эмулятор режима RAID1 с веб-интерфейсом для node.js. Программа интеллектуально копирует все файлы с исходного адреса (диск, папка, общий ресурс Samba) на адрес назначения (диск, папка или общий ресурс Samba).

Вы можете установить адрес источника и адрес назначения в файле конфигурации. Скрипт принимает два входных параметра (адрес источника и адрес назначения). Пример: node raid-emu.js c:\ d:\
Если указаны параметры запуска, они переопределяют адреса, указанные в файле конфигурации. 

Программа создает два виртуальных дерева (ЭТАП 1 и ЭТАП 2), а затем сравнивает их (ЭТАП 3). Далее он удаляет неактуальные (устаревшие или удаленные из источника) файлы (ЭТАП 4), а затем копирует новые (ЭТАП 5).
