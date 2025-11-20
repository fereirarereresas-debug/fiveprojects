#
# Makefile
#
# Makefile para compilação do Driver de Porta Serial Virtual Hyper-V
# Requer Windows Driver Kit (WDK) instalado
#
# Copyright (c) 2024 Five Projects
#

#
# Configurações padrão
#
!INCLUDE $(NTMAKEENV)\makefile.def

#
# Instruções de uso:
#
# Para compilar o driver:
#   1. Abra o prompt de comando do WDK (Windows Driver Kit Build Environment)
#   2. Navegue até o diretório do driver
#   3. Execute: build -ceZ
#
# Opções do comando build:
#   -c  : Limpa a compilação anterior
#   -e  : Exibe mensagens de erro detalhadas
#   -Z  : Não atualiza dependências
#
# O driver compilado será gerado em:
#   obj\<arch>\<debug|release>\hvserial.sys
#
# Onde <arch> pode ser: i386, amd64, arm, arm64
#

# Alvos adicionais

clean:
	@echo Limpando arquivos de compilação...
	@if exist obj rmdir /s /q obj
	@if exist *.log del /q *.log
	@echo Limpeza concluída.

install:
	@echo Para instalar o driver:
	@echo 1. Copie hvserial.sys para %%SystemRoot%%\System32\drivers\
	@echo 2. Copie hvserial.inf para um diretório temporário
	@echo 3. Execute: pnputil.exe -i -a hvserial.inf
	@echo 4. Ou use o Gerenciador de Dispositivos para instalar manualmente

help:
	@echo Driver de Porta Serial Virtual Hyper-V - Instruções de Compilação
	@echo.
	@echo Pré-requisitos:
	@echo   - Windows Driver Kit (WDK) instalado
	@echo   - Prompt de comando do WDK aberto
	@echo.
	@echo Comandos:
	@echo   build -ceZ    : Compilar o driver
	@echo   nmake clean   : Limpar arquivos de compilação
	@echo   nmake install : Exibir instruções de instalação
	@echo   nmake help    : Exibir esta mensagem de ajuda
	@echo.
	@echo Arquiteturas suportadas:
	@echo   - x86 (32-bit)
	@echo   - x64 (64-bit)
	@echo   - ARM
	@echo   - ARM64
	@echo.
	@echo Para mais informações, consulte README.md
