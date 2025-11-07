/*
 * hvserial_port.c
 * 
 * Manipuladores de Comunicação Serial para o Driver Hyper-V
 * 
 * Este arquivo contém as implementações das funções de leitura/escrita
 * e gerenciamento de buffers para comunicação serial.
 * 
 * Copyright (c) 2024 Five Projects
 */

#include "hvserial_driver.h"

/*
 * HvSerialEvtIoRead
 * 
 * Callback para processar requisições de leitura.
 * 
 * Parâmetros:
 *   Queue - Handle da fila de I/O
 *   Request - Handle da requisição
 *   Length - Número de bytes solicitados
 */
VOID
HvSerialEvtIoRead(
    _In_ WDFQUEUE Queue,
    _In_ WDFREQUEST Request,
    _In_ size_t Length
)
{
    NTSTATUS status;
    PDEVICE_CONTEXT deviceContext;
    WDFDEVICE device;
    PUCHAR buffer;
    size_t bufferLength;
    ULONG bytesRead = 0;

    device = WdfIoQueueGetDevice(Queue);
    deviceContext = GetDeviceContext(device);

    KdPrint(("HvSerial: HvSerialEvtIoRead - Solicitação de leitura de %lld bytes\n", (ULONGLONG)Length));

    //
    // Obter buffer de saída
    //
    status = WdfRequestRetrieveOutputBuffer(Request,
                                           Length,
                                           (PVOID*)&buffer,
                                           &bufferLength);

    if (!NT_SUCCESS(status)) {
        KdPrint(("HvSerial: HvSerialEvtIoRead - Falha ao obter buffer, status=0x%x\n", status));
        WdfRequestComplete(Request, status);
        return;
    }

    //
    // Ler dados do buffer de recepção
    //
    status = HvSerialReceiveData(deviceContext, 
                                buffer, 
                                (ULONG)bufferLength, 
                                &bytesRead);

    if (!NT_SUCCESS(status)) {
        KdPrint(("HvSerial: HvSerialEvtIoRead - Falha ao ler dados, status=0x%x\n", status));
        WdfRequestComplete(Request, status);
        return;
    }

    //
    // Completar requisição com número de bytes lidos
    //
    WdfRequestCompleteWithInformation(Request, STATUS_SUCCESS, bytesRead);

    KdPrint(("HvSerial: HvSerialEvtIoRead - Leitura concluída: %d bytes\n", bytesRead));
}

/*
 * HvSerialEvtIoWrite
 * 
 * Callback para processar requisições de escrita.
 * 
 * Parâmetros:
 *   Queue - Handle da fila de I/O
 *   Request - Handle da requisição
 *   Length - Número de bytes a serem escritos
 */
VOID
HvSerialEvtIoWrite(
    _In_ WDFQUEUE Queue,
    _In_ WDFREQUEST Request,
    _In_ size_t Length
)
{
    NTSTATUS status;
    PDEVICE_CONTEXT deviceContext;
    WDFDEVICE device;
    PUCHAR buffer;
    size_t bufferLength;

    device = WdfIoQueueGetDevice(Queue);
    deviceContext = GetDeviceContext(device);

    KdPrint(("HvSerial: HvSerialEvtIoWrite - Solicitação de escrita de %lld bytes\n", (ULONGLONG)Length));

    //
    // Obter buffer de entrada
    //
    status = WdfRequestRetrieveInputBuffer(Request,
                                          Length,
                                          (PVOID*)&buffer,
                                          &bufferLength);

    if (!NT_SUCCESS(status)) {
        KdPrint(("HvSerial: HvSerialEvtIoWrite - Falha ao obter buffer, status=0x%x\n", status));
        WdfRequestComplete(Request, status);
        return;
    }

    //
    // Transmitir dados
    //
    status = HvSerialTransmitData(deviceContext, buffer, (ULONG)bufferLength);

    if (!NT_SUCCESS(status)) {
        KdPrint(("HvSerial: HvSerialEvtIoWrite - Falha ao transmitir dados, status=0x%x\n", status));
        WdfRequestComplete(Request, status);
        return;
    }

    //
    // Completar requisição
    //
    WdfRequestCompleteWithInformation(Request, STATUS_SUCCESS, bufferLength);

    KdPrint(("HvSerial: HvSerialEvtIoWrite - Escrita concluída: %lld bytes\n", (ULONGLONG)bufferLength));
}

/*
 * HvSerialInitializeBuffer
 * 
 * Inicializa um buffer circular para dados seriais.
 * 
 * Parâmetros:
 *   Buffer - Ponteiro para estrutura do buffer
 *   Size - Tamanho do buffer em bytes
 * 
 * Retorna:
 *   STATUS_SUCCESS se bem-sucedido
 *   STATUS_INSUFFICIENT_RESOURCES se falhar alocação
 */
NTSTATUS
HvSerialInitializeBuffer(
    _Out_ PSERIAL_BUFFER Buffer,
    _In_ ULONG Size
)
{
    //
    // Alocar memória para o buffer
    //
    Buffer->Buffer = (PUCHAR)ExAllocatePoolWithTag(NonPagedPool,
                                                    Size,
                                                    HVSERIAL_POOL_TAG);

    if (Buffer->Buffer == NULL) {
        KdPrint(("HvSerial: HvSerialInitializeBuffer - Falha ao alocar memória\n"));
        return STATUS_INSUFFICIENT_RESOURCES;
    }

    //
    // Zerar buffer para evitar vazamento de informações
    //
    RtlZeroMemory(Buffer->Buffer, Size);

    //
    // Inicializar campos do buffer
    //
    Buffer->Size = Size;
    Buffer->ReadIndex = 0;
    Buffer->WriteIndex = 0;
    Buffer->BytesAvailable = 0;

    //
    // Inicializar spinlock
    //
    KeInitializeSpinLock(&Buffer->Lock);

    KdPrint(("HvSerial: HvSerialInitializeBuffer - Buffer inicializado: %d bytes\n", Size));

    return STATUS_SUCCESS;
}

/*
 * HvSerialCleanupBuffer
 * 
 * Libera recursos de um buffer circular.
 * 
 * Parâmetros:
 *   Buffer - Ponteiro para estrutura do buffer
 */
VOID
HvSerialCleanupBuffer(
    _In_ PSERIAL_BUFFER Buffer
)
{
    if (Buffer->Buffer != NULL) {
        ExFreePoolWithTag(Buffer->Buffer, HVSERIAL_POOL_TAG);
        Buffer->Buffer = NULL;
    }

    Buffer->Size = 0;
    Buffer->ReadIndex = 0;
    Buffer->WriteIndex = 0;
    Buffer->BytesAvailable = 0;

    KdPrint(("HvSerial: HvSerialCleanupBuffer - Buffer liberado\n"));
}

/*
 * HvSerialWriteBuffer
 * 
 * Escreve dados em um buffer circular.
 * 
 * Parâmetros:
 *   Buffer - Ponteiro para estrutura do buffer
 *   Data - Dados a serem escritos
 *   Length - Número de bytes a escrever
 *   BytesWritten - Recebe o número de bytes realmente escritos
 * 
 * Retorna:
 *   STATUS_SUCCESS se bem-sucedido
 *   STATUS_BUFFER_OVERFLOW se buffer estiver cheio
 */
NTSTATUS
HvSerialWriteBuffer(
    _In_ PSERIAL_BUFFER Buffer,
    _In_ PUCHAR Data,
    _In_ ULONG Length,
    _Out_ PULONG BytesWritten
)
{
    KIRQL oldIrql;
    ULONG spaceAvailable;
    ULONG bytesToWrite;
    ULONG firstChunk;
    ULONG secondChunk;

    *BytesWritten = 0;

    //
    // Adquirir spinlock
    //
    KeAcquireSpinLock(&Buffer->Lock, &oldIrql);

    //
    // Calcular espaço disponível
    //
    spaceAvailable = Buffer->Size - Buffer->BytesAvailable;

    if (spaceAvailable == 0) {
        KeReleaseSpinLock(&Buffer->Lock, oldIrql);
        KdPrint(("HvSerial: HvSerialWriteBuffer - Buffer cheio\n"));
        return STATUS_BUFFER_OVERFLOW;
    }

    //
    // Determinar quantos bytes escrever
    //
    bytesToWrite = (Length < spaceAvailable) ? Length : spaceAvailable;

    //
    // Escrever dados (pode ser em duas partes se houver wraparound)
    //
    if (Buffer->WriteIndex + bytesToWrite <= Buffer->Size) {
        //
        // Escrita em um único bloco
        //
        RtlCopyMemory(Buffer->Buffer + Buffer->WriteIndex, Data, bytesToWrite);
        Buffer->WriteIndex = (Buffer->WriteIndex + bytesToWrite) % Buffer->Size;
    } else {
        //
        // Escrita em dois blocos (wraparound)
        //
        firstChunk = Buffer->Size - Buffer->WriteIndex;
        secondChunk = bytesToWrite - firstChunk;

        RtlCopyMemory(Buffer->Buffer + Buffer->WriteIndex, Data, firstChunk);
        RtlCopyMemory(Buffer->Buffer, Data + firstChunk, secondChunk);

        Buffer->WriteIndex = secondChunk;
    }

    //
    // Atualizar contador de bytes disponíveis
    //
    Buffer->BytesAvailable += bytesToWrite;
    *BytesWritten = bytesToWrite;

    //
    // Liberar spinlock
    //
    KeReleaseSpinLock(&Buffer->Lock, oldIrql);

    return STATUS_SUCCESS;
}

/*
 * HvSerialReadBuffer
 * 
 * Lê dados de um buffer circular.
 * 
 * Parâmetros:
 *   Buffer - Ponteiro para estrutura do buffer
 *   Data - Buffer para receber dados
 *   Length - Número máximo de bytes a ler
 *   BytesRead - Recebe o número de bytes realmente lidos
 * 
 * Retorna:
 *   STATUS_SUCCESS se bem-sucedido
 *   STATUS_NO_DATA_DETECTED se buffer estiver vazio
 */
NTSTATUS
HvSerialReadBuffer(
    _In_ PSERIAL_BUFFER Buffer,
    _Out_ PUCHAR Data,
    _In_ ULONG Length,
    _Out_ PULONG BytesRead
)
{
    KIRQL oldIrql;
    ULONG bytesToRead;
    ULONG firstChunk;
    ULONG secondChunk;

    *BytesRead = 0;

    //
    // Adquirir spinlock
    //
    KeAcquireSpinLock(&Buffer->Lock, &oldIrql);

    //
    // Verificar se há dados disponíveis
    //
    if (Buffer->BytesAvailable == 0) {
        KeReleaseSpinLock(&Buffer->Lock, oldIrql);
        return STATUS_NO_DATA_DETECTED;
    }

    //
    // Determinar quantos bytes ler
    //
    bytesToRead = (Length < Buffer->BytesAvailable) ? Length : Buffer->BytesAvailable;

    //
    // Ler dados (pode ser em duas partes se houver wraparound)
    //
    if (Buffer->ReadIndex + bytesToRead <= Buffer->Size) {
        //
        // Leitura em um único bloco
        //
        RtlCopyMemory(Data, Buffer->Buffer + Buffer->ReadIndex, bytesToRead);
        Buffer->ReadIndex = (Buffer->ReadIndex + bytesToRead) % Buffer->Size;
    } else {
        //
        // Leitura em dois blocos (wraparound)
        //
        firstChunk = Buffer->Size - Buffer->ReadIndex;
        secondChunk = bytesToRead - firstChunk;

        RtlCopyMemory(Data, Buffer->Buffer + Buffer->ReadIndex, firstChunk);
        RtlCopyMemory(Data + firstChunk, Buffer->Buffer, secondChunk);

        Buffer->ReadIndex = secondChunk;
    }

    //
    // Atualizar contador de bytes disponíveis
    //
    Buffer->BytesAvailable -= bytesToRead;
    *BytesRead = bytesToRead;

    //
    // Liberar spinlock
    //
    KeReleaseSpinLock(&Buffer->Lock, oldIrql);

    return STATUS_SUCCESS;
}

/*
 * HvSerialTransmitData
 * 
 * Transmite dados através da porta serial.
 * 
 * Parâmetros:
 *   DeviceContext - Contexto do dispositivo
 *   Data - Dados a serem transmitidos
 *   Length - Número de bytes a transmitir
 * 
 * Retorna:
 *   STATUS_SUCCESS se bem-sucedido
 *   Código de erro NTSTATUS caso contrário
 */
NTSTATUS
HvSerialTransmitData(
    _In_ PDEVICE_CONTEXT DeviceContext,
    _In_ PUCHAR Data,
    _In_ ULONG Length
)
{
    NTSTATUS status;
    ULONG bytesWritten;
    KIRQL oldIrql;

    //
    // Escrever dados no buffer de transmissão
    //
    status = HvSerialWriteBuffer(&DeviceContext->TransmitBuffer,
                                Data,
                                Length,
                                &bytesWritten);

    if (!NT_SUCCESS(status)) {
        return status;
    }

    //
    // Atualizar estatísticas
    //
    KeAcquireSpinLock(&DeviceContext->DeviceLock, &oldIrql);
    DeviceContext->Statistics.BytesTransmitted += bytesWritten;
    KeReleaseSpinLock(&DeviceContext->DeviceLock, oldIrql);

    //
    // Se vinculado a uma porta física, transmitir dados
    //
    if (DeviceContext->IsBound && DeviceContext->PhysicalPort) {
        //
        // Aqui seria implementada a transmissão real para a porta física
        // Por enquanto, apenas registramos
        //
        KdPrint(("HvSerial: HvSerialTransmitData - Transmitindo %d bytes para porta física\n", bytesWritten));
    }

    //
    // Sinalizar evento de escrita
    //
    KeSetEvent(&DeviceContext->WriteEvent, IO_NO_INCREMENT, FALSE);

    return STATUS_SUCCESS;
}

/*
 * HvSerialReceiveData
 * 
 * Recebe dados da porta serial.
 * 
 * Parâmetros:
 *   DeviceContext - Contexto do dispositivo
 *   Data - Buffer para receber dados
 *   Length - Número máximo de bytes a receber
 *   BytesReceived - Recebe o número de bytes realmente recebidos
 * 
 * Retorna:
 *   STATUS_SUCCESS se bem-sucedido
 *   Código de erro NTSTATUS caso contrário
 */
NTSTATUS
HvSerialReceiveData(
    _In_ PDEVICE_CONTEXT DeviceContext,
    _Out_ PUCHAR Data,
    _In_ ULONG Length,
    _Out_ PULONG BytesReceived
)
{
    NTSTATUS status;
    KIRQL oldIrql;

    //
    // Se vinculado a uma porta física, primeiro tentar obter novos dados
    //
    if (DeviceContext->IsBound && DeviceContext->PhysicalPort) {
        //
        // Aqui seria implementada a recepção de dados da porta física
        // Por enquanto, apenas registramos
        //
        KdPrint(("HvSerial: HvSerialReceiveData - Verificando porta física por novos dados\n"));
    }

    //
    // Ler dados do buffer de recepção
    //
    status = HvSerialReadBuffer(&DeviceContext->ReceiveBuffer,
                               Data,
                               Length,
                               BytesReceived);

    if (NT_SUCCESS(status)) {
        //
        // Atualizar estatísticas
        //
        KeAcquireSpinLock(&DeviceContext->DeviceLock, &oldIrql);
        DeviceContext->Statistics.BytesReceived += *BytesReceived;
        KeReleaseSpinLock(&DeviceContext->DeviceLock, oldIrql);

        KdPrint(("HvSerial: HvSerialReceiveData - Recebidos %d bytes\n", *BytesReceived));
    } else if (status == STATUS_NO_DATA_DETECTED) {
        //
        // Sem dados disponíveis, retornar 0 bytes
        //
        *BytesReceived = 0;
        status = STATUS_SUCCESS;
    }

    return status;
}
