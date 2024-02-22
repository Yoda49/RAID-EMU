# RAID-EMU

== ENG ==
RAID1 mode emulator program with web-interface. The program intelligently copies all files from the source address (disk, folder, samba-share) to destination address (disk, folder or samba-share).

You can set the source address and destination address in the configuration file. The script takes two input parameters (source address and destination address). Example: node raid-emu.js c:\ d:\

If launch parameters are specified, they override the adresses specified in the configuration file.

==RUS==
Программа-эмулятор режима RAID1 с веб-интерфейсом. Программа разумно копирует все файлы с исходного адреса (диск, папка, общий ресурс Samba) на адрес назначения (диск, папка или общий ресурс Samba).

Вы можете установить адрес источника и адрес назначения в файле конфигурации. Скрипт принимает два входных параметра (адрес источника и адрес назначения). Пример: узел RAID-emu.js c:\ d:\

Если указаны параметры запуска, они переопределяют адреса, указанные в файле конфигурации.
