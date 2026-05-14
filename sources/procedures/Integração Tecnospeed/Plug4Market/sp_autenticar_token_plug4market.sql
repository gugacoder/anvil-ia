IF OBJECT_ID('sp_autenticar_token_plug4market') IS NOT NULL
    DROP PROCEDURE sp_autenticar_token_plug4market
GO

CREATE PROCEDURE sp_autenticar_token_plug4market
WITH ENCRYPTION 
AS
BEGIN

	/*
    AUTOR......: Éverton Coelho
    AREA.......: Integração Plug4Market
    MODULO.....: -
    DATA\HORA..: 23/01/2025
    
    Função: Parâmetros para geração de token de autenticação

    Exemplo de uso:
    EXEC sp_autenticar_token_plug4market
    */

    SELECT 
            'everton@processasistemas.com.br' as login
	      , '#Eve3837866' as password
    FOR XML PATH ('retorno'), TYPE
END
GO
